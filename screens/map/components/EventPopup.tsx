// screens/map/components/EventPopup.tsx — event pop-up content (prototype
// map-pop / map-popexp): event, ticket offers, organizer, venue.
import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Heart, Music, Share as ShareIcon } from 'lucide-react-native';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';

import type { Event } from '@/types/domain';
import { gs } from '@/theme/colors';
import Cover from '@/components/gs/Cover';
import { compactCount, eventEnd, eventPriceLabel, eventStart, formatCents, hhmm, isLiveNow, isPast, shortDate } from '@/lib/format';
import { getEventAccess } from '@/lib/supabase/eventAccess';
import { followOrganizer, unfollowOrganizer } from '@/lib/supabase/organizers';
import { effectiveCents, fetchOrganizerCard, fetchTicketOffers, type OrganizerCard, type TicketOffer } from '../api';
import { plainText } from '../model';
import { shareEvent } from '../actions';
import VenueSection, { type VenueInfo } from './VenueSection';

const LOW_STOCK = 30;
const AVATARS = ['#C9B8FF', '#FFB8CC', '#B8E6D2', '#FFD9A8'];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function Divider(): ReactElement {
  return <View style={{ height: 8, backgroundColor: '#F3F2F7' }} />;
}

function VerifiedBadge({ label }: Readonly<{ label: string }>): ReactElement {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" accessibilityLabel={label}>
      <SvgCircle cx={12} cy={12} r={10} fill={gs.violet} />
      <Path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke={gs.white} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function EventPopup({
  event,
  venue,
  saved,
  onToggleSave,
  onOpenEvent,
  onBook,
  onOpenBookings,
  onOpenOrganizer,
  onSeePlace,
}: Readonly<{
  event: Event;
  venue: VenueInfo | null;
  saved: boolean;
  onToggleSave: () => void;
  onOpenEvent: () => void;
  onBook: () => void;
  onOpenBookings: () => void;
  onOpenOrganizer: (id: string, name: string) => void;
  onSeePlace: () => void;
}>): ReactElement {
  const { t, i18n } = useTranslation();
  const id = String(event.id);
  const now = new Date();
  const live = isLiveNow(event, now);
  const past = isPast(event, now);

  const [offers, setOffers] = useState<ReadonlyArray<TicketOffer> | null>(null);
  const [offersError, setOffersError] = useState<boolean>(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [allOffers, setAllOffers] = useState<boolean>(false);
  const [booked, setBooked] = useState<boolean>(false);
  const [org, setOrg] = useState<OrganizerCard | null>(null);
  const [following, setFollowing] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    setOffers(null);
    setOffersError(false);
    setPicked(null);
    setAllOffers(false);
    setBooked(false);
    setOrg(null);
    fetchTicketOffers(id)
      .then((o) => {
        if (!alive) return;
        setOffers(o);
        const first = o.find((x) => x.seatsAvailable !== 0 && x.isOnSale !== false) ?? o[0];
        setPicked(first ? String(first.id) : null);
      })
      .catch(() => alive && setOffersError(true));
    getEventAccess({ eventId: id })
      .then((a) => alive && setBooked(a.hasReservation && a.status !== 'cancelled' && a.status !== 'refunded'))
      .catch(() => undefined);
    if (event.organizerId) {
      void fetchOrganizerCard(event.organizerId).then((c) => {
        if (!alive) return;
        setOrg(c);
        setFollowing(Boolean(c?.isFollowing));
      });
    }
    return () => {
      alive = false;
    };
  }, [id, event.organizerId]);

  // Type tags: first music style / party type / venue type.
  const typeTag = useMemo(() => {
    const party = event.partyTypes?.[0];
    const music = event.musicStyles?.[0];
    if (party && music && party.toLowerCase() !== music.toLowerCase()) return `${party} · ${music}`;
    return party ?? music ?? event.category ?? event.venueType ?? null;
  }, [event]);

  const start = eventStart(event);
  const end = eventEnd(event);
  let status: { label: string; bg: string; fg: string; dot: string } | null = null;
  if (live) status = { label: t('map.pop.liveNow'), bg: gs.pinkSoft, fg: gs.pinkDark, dot: gs.pink };
  else if (past) status = { label: t('map.pop.ended'), bg: gs.surface2, fg: gs.subtle, dot: gs.faint };
  else if (start) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const label = sameDay(start, now) ? t('map.pop.tonight') : sameDay(start, tomorrow) ? t('map.pop.tomorrow') : t('map.pop.upcoming');
    status = { label, bg: gs.surface2, fg: gs.subtle, dot: '#8A8799' };
  }

  let when = '';
  if (start) {
    const day = live || sameDay(start, now) ? t('map.pop.tonight') : shortDate(start, i18n.language);
    when = `${day} · ${hhmm(start)}${end ? ` → ${hhmm(end)}` : ''}`;
  }
  const host = [event.organizer ? t('map.pop.by', { name: event.organizer }) : null, event.venue ? t('map.pop.at', { venue: event.venue }) : null]
    .filter(Boolean)
    .join(' · ');
  const going = event.attendeeCount ?? (event.attendees?.length ?? 0) + (event.attendeesExtraCount ?? 0);
  const desc = plainText(event.description);

  const visibleOffers = offers ? (allOffers ? offers : offers.slice(0, 1)) : [];
  const more = offers ? offers.length - 1 : 0;
  const pickedOffer = offers?.find((o) => String(o.id) === picked) ?? null;
  const bookPrice = pickedOffer
    ? effectiveCents(pickedOffer) <= 0
      ? t('gs.free')
      : formatCents(effectiveCents(pickedOffer), pickedOffer.currency ?? 'EUR')
    : eventPriceLabel(event, t);

  const toggleFollow = (): void => {
    if (!org) return;
    const next = !following;
    setFollowing(next);
    (next ? followOrganizer(org.id) : unfollowOrganizer(org.id)).catch(() => setFollowing(!next));
  };

  return (
    <View>
      {/* ── Event ── */}
      <View className="px-5 pt-1 pb-6" style={{ gap: 16 }}>
        <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
          {typeTag ? (
            <View className="flex-row items-center h-7 px-3 rounded-full" style={{ backgroundColor: gs.violetSoft, gap: 6 }}>
              <Music size={14} color={gs.violetDark} />
              <Text className="text-[13px] font-bold" style={{ color: gs.violetDark }}>
                {typeTag}
              </Text>
            </View>
          ) : null}
          {status ? (
            <View className="flex-row items-center h-7 px-3 rounded-full" style={{ backgroundColor: status.bg, gap: 6 }}>
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: status.dot }} />
              <Text className="text-[13px] font-extrabold" style={{ color: status.fg }}>
                {status.label}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center" style={{ gap: 14 }}>
          <View
            className="rounded-full"
            style={{ width: 72, height: 72, padding: 3, borderWidth: 3, borderColor: live ? gs.pink : gs.violet, backgroundColor: gs.white }}
          >
            <Cover uri={event.imageUrl} toneKey={id} radius={40} style={{ flex: 1 }} />
          </View>
          <View className="flex-1" style={{ gap: 4 }}>
            <Pressable onPress={onOpenEvent} accessibilityRole="link" className="flex-row items-center" hitSlop={6}>
              <Text className="text-[24px] leading-[28px] font-extrabold text-ink flex-shrink" style={{ letterSpacing: -0.4 }}>
                {event.title}
              </Text>
              <ChevronRight size={18} color={gs.muted} style={{ marginLeft: 4 }} />
            </Pressable>
            {when ? (
              <Text className="text-[14px] font-bold" style={{ color: gs.violetDark }}>
                {when}
              </Text>
            ) : null}
            {host ? (
              <Text className="text-[13px] text-muted" numberOfLines={2}>
                {host}
              </Text>
            ) : null}
          </View>
        </View>

        {going > 0 ? (
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <View className="flex-row">
              {AVATARS.map((c, i) => (
                <View
                  key={c}
                  className="h-[30px] w-[30px] rounded-full border-2 border-white"
                  style={{ backgroundColor: c, marginLeft: i === 0 ? 0 : -10 }}
                />
              ))}
            </View>
            <Text className="text-[15px] text-muted">
              <Text className="font-extrabold text-ink">{compactCount(going)}</Text> {t('map.pop.peopleGoing')}
            </Text>
          </View>
        ) : null}

        {desc ? (
          <View className="rounded-[18px] p-4" style={{ backgroundColor: gs.surface, gap: 6 }}>
            <Text className="text-[12px] font-extrabold uppercase text-muted" style={{ letterSpacing: 0.7 }}>
              {t('map.pop.aboutEvent')}
            </Text>
            <Text className="text-[15px] leading-[22px]" style={{ color: '#2B2838' }} numberOfLines={6}>
              {desc}
            </Text>
          </View>
        ) : null}

        {/* Ticket offers */}
        <View style={{ gap: 10 }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-[17px] font-extrabold text-ink">{t('map.pop.ticketOffers')}</Text>
            {more > 0 ? (
              <Pressable
                onPress={() => setAllOffers((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: allOffers }}
                className="flex-row items-center h-11 px-1"
                style={{ gap: 4 }}
              >
                <Text className="text-[14px] font-bold" style={{ color: gs.violetDark }}>
                  {allOffers ? t('map.pop.showLess') : t(more === 1 ? 'map.pop.moreOffer' : 'map.pop.moreOffers', { count: more })}
                </Text>
                <ChevronDown size={16} color={gs.violetDark} style={{ transform: [{ rotate: allOffers ? '180deg' : '0deg' }] }} />
              </Pressable>
            ) : null}
          </View>
          {offers == null && !offersError ? (
            <View className="h-16 items-center justify-center">
              <ActivityIndicator color={gs.violet} />
            </View>
          ) : null}
          {offersError ? <Text className="text-[14px] text-muted">{t('map.pop.offersError')}</Text> : null}
          {offers && offers.length === 0 ? <Text className="text-[14px] text-muted">{t('map.pop.noOffers')}</Text> : null}
          {visibleOffers.map((o) => (
            <OfferRow key={String(o.id)} offer={o} selected={String(o.id) === picked} onPress={() => setPicked(String(o.id))} />
          ))}
        </View>

        {past ? null : booked ? (
          <Pressable
            onPress={onOpenBookings}
            accessibilityRole="button"
            className="h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: gs.green, shadowColor: gs.green, shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}
          >
            <Text className="text-[17px] font-extrabold text-white">{t('map.pop.booked')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onBook}
            accessibilityRole="button"
            className="h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: gs.violet, shadowColor: gs.violet, shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}
          >
            <Text className="text-[17px] font-extrabold text-white">
              {bookPrice ? t('map.pop.book', { price: bookPrice }) : t('map.pop.bookPlain')}
            </Text>
          </Pressable>
        )}

        <View className="flex-row" style={{ gap: 10 }}>
          <Pressable
            onPress={onOpenEvent}
            accessibilityRole="button"
            className="flex-1 h-12 rounded-full items-center justify-center bg-white"
            style={{ borderWidth: 1.5, borderColor: gs.lineStrong }}
          >
            <Text className="text-[15px] font-bold text-ink">{t('map.pop.seeEvent')}</Text>
          </Pressable>
          <Pressable
            onPress={onToggleSave}
            accessibilityRole="button"
            accessibilityLabel={saved ? t('map.pop.unsave') : t('map.pop.save')}
            accessibilityState={{ selected: saved }}
            className="h-12 w-12 rounded-full items-center justify-center bg-white"
            style={{ borderWidth: 1.5, borderColor: saved ? gs.pink : gs.lineStrong }}
          >
            <Heart size={18} color={saved ? gs.pink : gs.ink} fill={saved ? gs.pink : 'transparent'} />
          </Pressable>
          <Pressable
            onPress={() =>
              void shareEvent({ title: event.title, when, venue: [event.venue, event.city].filter(Boolean).join(', '), price: eventPriceLabel(event, t) })
            }
            accessibilityRole="button"
            accessibilityLabel={t('map.pop.shareEvent')}
            className="h-12 w-12 rounded-full items-center justify-center bg-white"
            style={{ borderWidth: 1.5, borderColor: gs.lineStrong }}
          >
            <ShareIcon size={18} color={gs.ink} />
          </Pressable>
        </View>
      </View>

      {/* ── Organizer ── */}
      {org ? (
        <>
          <Divider />
          <View className="px-5 pt-[22px] pb-6" style={{ gap: 16 }}>
            <Text className="text-[12px] font-extrabold uppercase text-muted" style={{ letterSpacing: 0.7 }}>
              {t('map.pop.organizer')}
            </Text>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <Pressable
                onPress={() => onOpenOrganizer(org.id, org.name)}
                accessibilityRole="link"
                accessibilityLabel={`${t('map.pop.seeOrganizer')}: ${org.name}`}
                className="flex-1 flex-row items-center"
                style={{ gap: 12 }}
              >
                {org.logoUrl ? (
                  <Cover uri={org.logoUrl} toneKey={org.id} radius={28} style={{ width: 56, height: 56 }} />
                ) : (
                  <View className="h-14 w-14 rounded-full items-center justify-center" style={{ backgroundColor: gs.ink }}>
                    <Text className="text-[18px] font-extrabold text-white">{initials(org.name)}</Text>
                  </View>
                )}
                <View className="flex-1" style={{ gap: 2 }}>
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text className="text-[17px] font-extrabold text-ink flex-shrink">{org.name}</Text>
                    {org.verified ? <VerifiedBadge label={t('map.pop.verified')} /> : null}
                  </View>
                  <Text className="text-[13px] text-muted">
                    {[t('map.pop.eventOrganizer'), org.city].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={toggleFollow}
                accessibilityRole="button"
                accessibilityState={{ selected: following }}
                className="h-11 px-[18px] rounded-full items-center justify-center"
                style={{ backgroundColor: following ? gs.white : gs.violet, borderWidth: 1.5, borderColor: following ? gs.lineStrong : gs.violet }}
              >
                <Text className="text-[14px] font-extrabold" style={{ color: following ? gs.ink : gs.white }}>
                  {following ? t('map.pop.following') : t('map.pop.follow')}
                </Text>
              </Pressable>
            </View>
            <View className="flex-row" style={{ gap: 8 }}>
              {org.followers != null ? <Stat value={compactCount(org.followers)} label={t('map.pop.followers')} /> : null}
              {org.events != null ? <Stat value={String(org.events)} label={t('map.pop.eventsHosted')} /> : null}
              <Stat
                value={org.rating != null ? org.rating.toFixed(1) : '–'}
                star={org.rating != null}
                label={org.reviewCount ? `${compactCount(org.reviewCount)} ${t('map.pop.reviews')}` : t('map.pop.noReviews')}
              />
            </View>
            {org.review ? (
              <View className="rounded-[18px] px-4 py-3.5" style={{ borderWidth: 1.5, borderColor: gs.line, gap: 8 }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <View className="h-7 w-7 rounded-full" style={{ backgroundColor: '#FFB8CC' }} />
                    <Text className="text-[14px] font-bold text-ink">{org.review.name}</Text>
                  </View>
                  <Text className="text-[13px] font-bold text-ink">
                    <Text style={{ color: '#C98A00' }}>★</Text> {org.review.rating.toFixed(1)}
                  </Text>
                </View>
                <Text className="text-[14px] leading-[21px]" style={{ color: '#2B2838' }} numberOfLines={4}>
                  {org.review.text}
                </Text>
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      {/* ── Venue ── */}
      {venue ? (
        <>
          <Divider />
          <View className="pt-[22px]">
            <VenueSection venue={venue} heading={t('map.pop.venue')} onSeePlace={onSeePlace} />
          </View>
        </>
      ) : null}
    </View>
  );
}

function Stat({ value, label, star }: Readonly<{ value: string; label: string; star?: boolean }>): ReactElement {
  return (
    <View className="flex-1 rounded-[14px] p-3" style={{ backgroundColor: gs.surface, gap: 2 }}>
      <Text className="text-[18px] font-extrabold text-ink" numberOfLines={1}>
        {star ? <Text style={{ color: '#C98A00' }}>★ </Text> : null}
        {value}
      </Text>
      <Text className="text-[12px] text-muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function OfferRow({ offer, selected, onPress }: Readonly<{ offer: TicketOffer; selected: boolean; onPress: () => void }>): ReactElement {
  const { t } = useTranslation();
  const currency = offer.currency ?? 'EUR';
  const price = effectiveCents(offer);
  const regular = offer.priceCents ?? 0;
  const onSale = typeof offer.salePriceCents === 'number' && offer.salePriceCents < regular;
  const soldOut = offer.seatsAvailable === 0 || offer.isOnSale === false;
  const low = typeof offer.seatsAvailable === 'number' && offer.seatsAvailable > 0 && offer.seatsAvailable <= LOW_STOCK;
  const note = soldOut
    ? t('map.pop.soldOut')
    : low
      ? t('map.pop.onlyLeft', { count: offer.seatsAvailable ?? 0 })
      : offer.freeForLadies
        ? t('map.pop.freeLadies')
        : (offer.description ?? offer.benefits?.filter(Boolean).join(' · ') ?? '');
  const scarce = soldOut || low;
  return (
    <Pressable
      onPress={onPress}
      disabled={soldOut}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: soldOut }}
      className="flex-row items-center p-3.5 rounded-[18px]"
      style={{
        gap: 12,
        borderWidth: 2,
        borderColor: selected ? gs.violet : gs.line,
        backgroundColor: selected ? '#F6F3FF' : gs.white,
        opacity: soldOut ? 0.55 : 1,
      }}
    >
      <View
        className="h-[22px] w-[22px] rounded-full items-center justify-center"
        style={{ borderWidth: 2, borderColor: selected ? gs.violet : gs.lineStrong }}
      >
        {selected ? <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: gs.violet }} /> : null}
      </View>
      <View className="flex-1" style={{ gap: 3 }}>
        <Text className="text-[15px] font-extrabold text-ink">{offer.name ?? '—'}</Text>
        {note ? (
          <Text className="text-[13px]" style={{ color: scarce ? '#A3124A' : gs.muted, fontWeight: scarce ? '700' : '400' }} numberOfLines={2}>
            {note}
          </Text>
        ) : null}
      </View>
      <View className="items-end" style={{ gap: 4 }}>
        <Text className="text-[20px] font-extrabold text-ink">{price <= 0 ? t('gs.free') : formatCents(price, currency)}</Text>
        {onSale ? (
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text className="text-[13px] text-muted" style={{ textDecorationLine: 'line-through' }}>
              {formatCents(regular, currency)}
            </Text>
            <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: gs.pink }}>
              <Text className="text-[11px] font-extrabold text-white">−{Math.round(((regular - price) / regular) * 100)}%</Text>
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
