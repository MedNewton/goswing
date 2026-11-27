// pages/MyReviewsPage.tsx — My reviews: stats, "waiting for your review"
// (Phase 4 route 154), filters by target type, review cards with edit / delete.
import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Star } from 'lucide-react-native';

import { gs } from '@/theme/colors';
import { Cover, EmptyState, GsButton, GsSheet, Pill, StatusChip } from '@/components/gs';
import type { ChipTone } from '@/components/gs/StatusChip';
import { useAppNav } from '@/navigation/AppNav';
import {
  createReview,
  deleteReview,
  getMyReviews,
  getReviewEligibility,
  updateReview,
  type ApiReviewEligibility,
  type ReviewTargetType,
} from '@/lib/api/profile';
import { Card, ConfirmSheet, Input, Loading, PageScaffold, SectionTitle, STAR, Stars, TextAction } from '@/screens/profile/components/ui';

type MyReviewsPageProps = Readonly<{ onBack: () => void }>;

type Filter = 'all' | ReviewTargetType;

type ReviewItem = Readonly<{
  id: string;
  targetType: ReviewTargetType;
  targetId: string;
  name: string;
  imageUrl: string | null;
  createdAt: string | null;
  rating: number;
  comment: string | null;
  helpfulCount: number | null;
  reply: string | null;
  replyFrom: string;
  isDraft: boolean;
}>;

type Stats = Readonly<{ count: number; average: number | null; helpful: number | null }>;

const TYPE_TONE: Readonly<Record<ReviewTargetType, ChipTone>> = { event: 'violet', venue: 'orange', organizer: 'blue' };

/** Text the user is writing in the sheet (edit or new review). */
type Draft = Readonly<{
  mode: 'edit' | 'new';
  reviewId?: string;
  target?: ApiReviewEligibility;
  title: string;
  rating: number;
  comment: string;
}>;

export default function MyReviewsPage({ onBack }: MyReviewsPageProps): ReactElement {
  const { t, i18n } = useTranslation();
  const nav = useAppNav();

  const [items, setItems] = useState<ReadonlyArray<ReviewItem>>([]);
  const [stats, setStats] = useState<Stats>({ count: 0, average: null, helpful: null });
  const [waiting, setWaiting] = useState<ReadonlyArray<ApiReviewEligibility> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ReviewItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [res, eligible] = await Promise.all([getMyReviews(), getReviewEligibility().catch(() => null)]);
      const mapped: ReviewItem[] = (res.items ?? []).map((r) => {
        const type: ReviewTargetType = r.targetType ?? 'event';
        const name = r.target?.name ?? r.eventTitle ?? '';
        return {
          id: String(r.id),
          targetType: type,
          targetId: String(r.target?.id ?? r.eventId ?? ''),
          name,
          imageUrl: r.target?.imageUrl ?? r.eventImageUrl ?? null,
          createdAt: r.createdAt ?? null,
          rating: Math.max(0, Math.min(5, Math.round(Number(r.rating ?? 0)))),
          comment: r.comment ?? null,
          helpfulCount: typeof r.helpfulCount === 'number' ? r.helpfulCount : null,
          reply: r.adminReply ?? null,
          replyFrom: type === 'event' ? r.organizerName || name : name,
          isDraft: Boolean(r.isDraft),
        };
      });
      setItems(mapped);
      const published = mapped.filter((r) => !r.isDraft);
      const avg = published.length ? published.reduce((a, r) => a + r.rating, 0) / published.length : null;
      setStats({
        count: res.stats?.count ?? res.totals?.publishedCount ?? published.length,
        average: res.stats?.averageGiven ?? res.totals?.averageRating ?? avg,
        helpful: typeof res.stats?.helpfulReceived === 'number' ? res.stats.helpfulReceived : null,
      });
      setWaiting(eligible ? eligible.filter((e) => !e.reviewed) : null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('myReviews.errLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: items.length, event: 0, venue: 0, organizer: 0 };
    for (const r of items) c[r.targetType] += 1;
    return c;
  }, [items]);

  const shown = filter === 'all' ? items : items.filter((r) => r.targetType === filter);
  const fmtDate = (iso: string | null): string =>
    iso ? new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const typeLabel = (type: ReviewTargetType): string => t(`profile.reviews.type.${type}`);

  const openTarget = (r: ReviewItem): void => {
    if (!r.targetId) return;
    if (r.targetType === 'event') nav.openEvent(r.targetId);
    else if (r.targetType === 'organizer') nav.push({ name: 'organizerProfile', organizerId: r.targetId, organizerName: r.name });
    else nav.push({ name: 'place', place: { id: r.targetId, name: r.name, source: 'goswing', venueId: r.targetId } });
  };

  const submit = async (): Promise<void> => {
    if (!draft || draft.rating < 1) return;
    try {
      setSaving(true);
      const comment = draft.comment.trim() || null;
      if (draft.mode === 'edit' && draft.reviewId) {
        await updateReview(draft.reviewId, { rating: draft.rating, comment });
      } else if (draft.target) {
        await createReview(draft.target, { rating: draft.rating, comment });
      }
      setDraft(null);
      await load();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('profile.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!toDelete) return;
    try {
      setDeleting(true);
      await deleteReview(toDelete.id);
      setItems((xs) => xs.filter((x) => x.id !== toDelete.id));
      setToDelete(null);
      void load();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('myReviews.errCouldNotDelete'));
    } finally {
      setDeleting(false);
    }
  };

  const filters: ReadonlyArray<Filter> = ['all', 'event', 'venue', 'organizer'];
  const visibleFilters = filters.filter((f) => f === 'all' || f === filter || counts[f] > 0);

  return (
    <PageScaffold title={t('profile.reviews.title')} onBack={onBack}>
      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState title={t('gs.errorTitle')} message={error} actionLabel={t('gs.retry')} onAction={() => void load()} />
      ) : (
        <>
          {/* Stats */}
          <Card className="flex-row py-4 mt-1">
            <StatCell value={String(stats.count)} label={t('profile.reviews.statCount', { count: stats.count })} />
            <View style={{ width: 1, backgroundColor: gs.line }} />
            <StatCell value={stats.average != null ? stats.average.toFixed(1) : '–'} label={t('profile.reviews.statAverage')} star />
            {stats.helpful != null ? (
              <>
                <View style={{ width: 1, backgroundColor: gs.line }} />
                <StatCell value={String(stats.helpful)} label={t('profile.reviews.statHelpful')} />
              </>
            ) : null}
          </Card>

          {/* Waiting for your review (route 154) */}
          {waiting && waiting.length > 0 ? (
            <>
              <SectionTitle title={t('profile.reviews.waiting')} />
              <View className="gap-y-3">
                {waiting.map((w) => (
                  <Card key={`${w.targetType}-${w.targetId}-${w.reservationId ?? ''}`} className="p-4">
                    <View className="flex-row items-center">
                      <Cover uri={w.imageUrl} toneKey={w.targetId} radius={14} style={{ width: 56, height: 56 }} />
                      <View className="flex-1 ml-3">
                        <Text className="text-[17px] font-extrabold text-ink" numberOfLines={1}>
                          {w.targetName ?? w.eventTitle ?? ''}
                        </Text>
                        <Text className="text-[14px] text-subtle" numberOfLines={1}>
                          {[
                            typeLabel(w.targetType),
                            w.targetType !== 'event' ? w.eventTitle : null,
                            w.visitDate ? fmtDate(w.visitDate) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                    </View>
                    <View className="mt-2 -ml-2">
                      <Stars
                        rating={0}
                        size={30}
                        onChange={(r) =>
                          setDraft({ mode: 'new', target: w, title: w.targetName ?? w.eventTitle ?? '', rating: r, comment: '' })
                        }
                      />
                    </View>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {/* Filters — types without reviews are hidden (only event reviews exist until Phase 4 § I ships). */}
          {visibleFilters.length > 2 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
              className="mt-6 mb-4"
            >
              {visibleFilters.map((f) => (
                <Pill
                  key={f}
                  label={`${t(`profile.reviews.filter.${f}`)} (${counts[f]})`}
                  active={filter === f}
                  onPress={() => setFilter(f)}
                />
              ))}
            </ScrollView>
          ) : (
            <View className="h-6" />
          )}

          {shown.length === 0 ? (
            <EmptyState
              icon={<Star size={28} color={gs.violet} />}
              title={filter === 'all' ? t('myReviews.noPublished') : t('profile.reviews.emptyFiltered')}
              message={filter === 'all' ? t('myReviews.noPublishedSubtitle') : undefined}
            />
          ) : (
            <View className="gap-y-3">
              {shown.map((r) => (
                <Card key={r.id} className="p-4">
                  <Pressable
                    onPress={() => openTarget(r)}
                    accessibilityRole="button"
                    accessibilityLabel={`${typeLabel(r.targetType)}: ${r.name}`}
                    className="flex-row items-center"
                  >
                    <Cover uri={r.imageUrl} toneKey={r.targetId || r.id} radius={12} style={{ width: 52, height: 52 }} />
                    <View className="flex-1 ml-3 pr-2">
                      <View className="flex-row items-center gap-x-1.5">
                        <StatusChip label={typeLabel(r.targetType)} tone={TYPE_TONE[r.targetType]} size="xs" />
                        {r.isDraft ? <StatusChip label={t('profile.reviews.draft')} tone="gray" size="xs" /> : null}
                      </View>
                      <Text className="text-[18px] font-extrabold text-ink mt-0.5" numberOfLines={1}>
                        {r.name}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={gs.subtle} />
                  </Pressable>

                  <View className="flex-row items-center mt-2.5">
                    <Stars rating={r.rating} size={16} />
                    <Text className="ml-2 text-[14px] text-subtle">{fmtDate(r.createdAt)}</Text>
                  </View>

                  {r.comment ? <Text className="mt-2 text-[15px] text-ink leading-[22px]">{r.comment}</Text> : null}

                  {r.reply ? (
                    <View className="mt-3 rounded-2xl p-3" style={{ backgroundColor: gs.surface2 }}>
                      <Text className="text-[13px] font-extrabold" style={{ color: gs.violet }}>
                        {t('profile.reviews.replyFrom', { name: r.replyFrom })}
                      </Text>
                      <Text className="text-[14px] text-ink mt-0.5 leading-[20px]">{r.reply}</Text>
                    </View>
                  ) : null}

                  <View className="flex-row items-center mt-3 pt-1 border-t" style={{ borderColor: gs.line }}>
                    <Text className="flex-1 text-[13px] text-muted">
                      {r.helpfulCount ? t('profile.reviews.helpful', { count: r.helpfulCount }) : ''}
                    </Text>
                    <TextAction
                      label={t('common.edit')}
                      onPress={() => setDraft({ mode: 'edit', reviewId: r.id, title: r.name, rating: r.rating, comment: r.comment ?? '' })}
                    />
                    <View className="w-3" />
                    <TextAction label={t('profile.reviews.delete')} tone="danger" onPress={() => setToDelete(r)} />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </>
      )}

      <GsSheet
        visible={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.mode === 'edit' ? t('profile.reviews.editTitle') : t('profile.reviews.writeTitle')}
        footer={
          <GsButton
            label={draft?.mode === 'edit' ? t('profile.reviews.saveChanges') : t('profile.reviews.publish')}
            onPress={() => void submit()}
            loading={saving}
            disabled={!draft || draft.rating < 1}
            fullWidth
            size="lg"
          />
        }
      >
        {draft ? (
          <View className="px-5">
            <Text className="text-[16px] font-bold text-subtle">{draft.title}</Text>
            <View className="mt-2 -ml-2">
              <Stars rating={draft.rating} size={34} onChange={(rating) => setDraft({ ...draft, rating })} />
            </View>
            <View className="mt-3">
              <Input
                value={draft.comment}
                onChangeText={(comment) => setDraft({ ...draft, comment: comment.slice(0, 500) })}
                placeholder={t('profile.reviews.commentPlaceholder')}
                multiline
                accessibilityLabel={t('profile.reviews.commentPlaceholder')}
              />
              <Text className="text-right text-[12px] text-muted mt-1">{draft.comment.length}/500</Text>
            </View>
          </View>
        ) : null}
      </GsSheet>

      <ConfirmSheet
        visible={!!toDelete}
        title={t('profile.reviews.deleteTitle')}
        message={t('profile.reviews.deleteMessage', { name: toDelete?.name ?? '' })}
        confirmLabel={t('profile.reviews.delete')}
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setToDelete(null)}
      />
    </PageScaffold>
  );
}

function StatCell({ value, label, star }: Readonly<{ value: string; label: string; star?: boolean }>): ReactElement {
  return (
    <View className="flex-1 items-center px-1">
      <View className="flex-row items-center">
        {star ? <Star size={18} color={STAR} fill={STAR} style={{ marginRight: 4 }} /> : null}
        <Text className="text-[24px] font-extrabold text-ink">{value}</Text>
      </View>
      <Text className="text-[13px] text-subtle mt-0.5 text-center" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
