import React, { useMemo, type ReactElement } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import HeroHeader from '@/components/event/HeroHeader';
import InfoNoteCard from '@/components/event/InfoNoteCard';
import TitleMeta from '@/components/event/TitleMeta';
import ActionChips from '@/components/event/ActionChips';
import OrganizerCard from '@/components/event/OrganizerCard';
import EventGallery from '@/components/event/EventGallery';
import SectionTabs from '@/components/event/SectionTabs';
import AboutSection from '@/components/event/AboutSection';
import AttendeesSection from '@/components/event/AttendeesSection';
import CancellationPolicy from '@/components/event/CancellationPolicy';
import MoreFromOrganizer from '@/components/event/MoreFromOrganizer';
import SimilarEvents from '@/components/event/SimilarEvents';
import FloatingBookButton from '@/components/event/FloatingBookButton';
import { getEvents } from '@/data/loaders';
import { Event } from '@/types/domain';

export type EventPageProps = Readonly<{
    eventId: string;
    onBack?: () => void;
    onBook?: (eventId: string) => void;
}>;

function formatDateTime(iso?: string | null): { date: string; time: string } | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return { date, time };
}

export default function EventPage({ eventId, onBack, onBook }: EventPageProps): ReactElement {
    const insets = useSafeAreaInsets();
    const event = useMemo(() => getEvents().find((e) => e.id === eventId) ?? null, [eventId]);

    if (!event) {
        return (
            <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white items-center justify-center">
                <Text className="text-gray700">Event not found.</Text>
            </SafeAreaView>
        );
    }

    const dt = formatDateTime(event.startsAtIso);
    const dateLabel = dt?.date ?? null;
    const timeLabel = dt?.time ?? null;

    // extra bottom padding so the page scrolls past the navbar & button
    const bottomPad = (insets.bottom || 0) + 140;

    return (
        <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
            <View className="flex-1">
                <HeroHeader
                    imageUrl={event.imageUrl}
                    onBack={onBack}
                    onToggleFavorite={() => { }}
                    onShare={() => { }}
                />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerClassName="pb-40"
                    contentContainerStyle={{ paddingBottom: bottomPad }}
                >
                    <InfoNoteCard />
                    <TitleMeta
                        title={event.title}
                        dateLabel={dateLabel}
                        timeLabel={timeLabel}
                        venue={event.venue ?? null}
                        city={event.city ?? null}
                    />
                    <ActionChips />
                    <OrganizerCard organizer={event.organizer} />
                    <EventGallery />
                    <SectionTabs event={event as Event} />

                </ScrollView>

                <FloatingBookButton onPress={() => onBook?.(event.id)} />
            </View>
        </SafeAreaView>
    );
}
