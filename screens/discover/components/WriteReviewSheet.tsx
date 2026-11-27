// screens/discover/components/WriteReviewSheet.tsx — "Rate {place}" (plc2-write).
// Only opened when the review-eligibility route (Phase 4 route 154) lists a
// visit the user has not reviewed yet.
import React, { useEffect, useState, type ReactElement } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import { GsButton, GsSheet } from '@/components/gs';
import { gs } from '@/theme/colors';
import { shortDate } from '@/lib/format';
import type { ReviewVisit } from '@/lib/api/discover';

const MAX = 500;

export default function WriteReviewSheet({
  visible,
  name,
  visits,
  onClose,
  onSubmit,
}: Readonly<{
  visible: boolean;
  name: string;
  visits: ReadonlyArray<ReviewVisit>;
  onClose: () => void;
  onSubmit: (p: { reservationId: string; rating: number; comment: string | null }) => Promise<void>;
}>): ReactElement {
  const { t, i18n } = useTranslation();
  const open = visits.filter((v) => !v.reviewed);
  const [visit, setVisit] = useState<string | null>(open[0]?.reservationId ?? null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setVisit(open[0]?.reservationId ?? null);
      setRating(0);
      setComment('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const submit = async (): Promise<void> => {
    if (!visit || rating === 0) return;
    setBusy(true);
    try {
      await onSubmit({ reservationId: visit, rating, comment: comment.trim() || null });
    } finally {
      setBusy(false);
    }
  };

  return (
    <GsSheet
      visible={visible}
      onClose={onClose}
      title={t('discover.reviews.rateTitle', { name })}
      footer={
        <View>
          <GsButton label={t('discover.reviews.post')} size="lg" fullWidth disabled={!visit || rating === 0} loading={busy} onPress={() => void submit()} />
          {rating === 0 ? <Text className="mt-2 text-center text-[13px] font-semibold text-muted">{t('discover.reviews.needScore')}</Text> : null}
        </View>
      }
    >
      <View className="px-5">
        <Text className="text-[14px] text-muted">{t('discover.reviews.publicNote')}</Text>

        <Text className="mt-5 text-[16px] font-extrabold text-ink">{t('discover.reviews.whichVisit')}</Text>
        <View className="mt-2.5 gap-y-2">
          {open.map((v) => {
            const on = v.reservationId === visit;
            const d = v.visitDate ? new Date(v.visitDate) : null;
            return (
              <Pressable
                key={v.reservationId}
                onPress={() => setVisit(v.reservationId)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                className="flex-row items-center rounded-[18px] p-3.5"
                style={{ borderWidth: 1.5, borderColor: on ? gs.violet : gs.lineStrong, backgroundColor: on ? gs.violetSoft : gs.white }}
              >
                <View className="h-5 w-5 items-center justify-center rounded-full" style={{ borderWidth: 2, borderColor: on ? gs.violet : gs.lineStrong }}>
                  {on ? <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: gs.violet }} /> : null}
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-extrabold text-ink">{v.eventTitle ?? name}</Text>
                  {d && !Number.isNaN(d.getTime()) ? (
                    <Text className="text-[12px] text-muted">{t('discover.reviews.bookedOn', { date: shortDate(d, i18n.language) })}</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <Text className="text-[16px] font-extrabold text-ink">{t('discover.reviews.yourScore')}</Text>
          <Text className="text-[13px] font-semibold text-muted">{t('discover.reviews.tapStar')}</Text>
        </View>
        <View className="mt-2 flex-row justify-between px-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable
              key={i}
              onPress={() => setRating(i)}
              accessibilityRole="button"
              accessibilityLabel={t('discover.reviews.starsA11y', { count: i })}
              accessibilityState={{ selected: rating >= i }}
              className="h-12 w-12 items-center justify-center"
            >
              <Star size={36} color={rating >= i ? '#E8A317' : gs.lineStrong} fill={rating >= i ? '#E8A317' : 'transparent'} />
            </Pressable>
          ))}
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <Text className="text-[16px] font-extrabold text-ink">{t('discover.reviews.yourReview')}</Text>
          <Text className="text-[13px] font-semibold text-muted">
            {comment.length}/{MAX}
          </Text>
        </View>
        <TextInput
          value={comment}
          onChangeText={(v) => setComment(v.slice(0, MAX))}
          placeholder={t('discover.reviews.placeholder')}
          placeholderTextColor={gs.faint}
          multiline
          textAlignVertical="top"
          accessibilityLabel={t('discover.reviews.yourReview')}
          className="mt-2 min-h-[110px] rounded-[18px] p-3.5 text-[15px] text-ink"
          style={{ backgroundColor: gs.surface, borderWidth: 1, borderColor: gs.line }}
        />
      </View>
    </GsSheet>
  );
}
