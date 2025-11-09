import React, { useMemo, useState, type ReactElement } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import HeroHeader from '@/components/event/HeroHeader';
import InfoNoteCard from '@/components/event/InfoNoteCard';
import TitleMeta from '@/components/event/TitleMeta';
import ActionChips from '@/components/event/ActionChips';
import OrganizerCard from '@/components/event/OrganizerCard';
import EventGallery from '@/components/event/EventGallery';
import SectionTabs from '@/components/event/SectionTabs';
import FloatingBookButton from '@/components/event/FloatingBookButton';
import { getEvents } from '@/data/loaders';
import { Event } from '@/types/domain';
import EventGalleryPage from '@/pages/EventGalleryPage';
import BookTicketsSheet from '@/components/event/BookTicketsSheet';

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

    const [showGallery, setShowGallery] = useState(false);
    const [startIndex, setStartIndex] = useState<number | undefined>(undefined);

    const [sheetOpen, setSheetOpen] = useState(false);

    const images = useMemo(
        () => [
            'https://picsum.photos/seed/evg1/900/700',
            'https://picsum.photos/seed/evg2/900/700',
            'https://picsum.photos/seed/evg3/900/700',
            'https://picsum.photos/seed/evg4/900/700',
            'https://picsum.photos/seed/evg5/900/700',
            'https://picsum.photos/seed/evg6/900/700',
            'https://picsum.photos/seed/evg7/900/700',
            'https://picsum.photos/seed/evg8/900/700',
            'https://picsum.photos/seed/evg9/900/700',
            'https://picsum.photos/seed/evg10/900/700',
        ],
        []
    );

    const openGallery = (index?: number): void => {
        setStartIndex(index);
        setShowGallery(true);
    };

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

    const bottomPad = (insets.bottom || 0) + 140;

    if (showGallery) {
        return (
            <EventGalleryPage
                eventTitle={event.title}
                images={images}
                startIndex={startIndex}
                onBack={() => setShowGallery(false)}
                bottomTab="home"
                onChangeBottomTab={() => { }}
            />
        );
    }

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

                    <EventGallery
                        images={images}
                        eventTitle={event.title}
                        onOpenAll={() => openGallery()}
                        onOpenIndex={(i) => openGallery(i)}
                    />

                    <SectionTabs event={event as Event} />
                </ScrollView>

                <FloatingBookButton onPress={() => setSheetOpen(true)} />

                <BookTicketsSheet
                    visible={sheetOpen}
                    onClose={() => setSheetOpen(false)}
                    title="Free Entry"
                    price={0}
                    onProceed={({ qty }) => {
                        console.log('Proceed with qty:', qty);
                        setSheetOpen(false);
                    }}
                />
            </View>
        </SafeAreaView>
    );
}
