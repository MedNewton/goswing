import React, { type ReactElement } from 'react';
import { View, Text, Pressable, type ViewProps } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type HomeTabKey = 'events' | 'map';

export type HomeTabsProps = Readonly<
  {
    activeKey: HomeTabKey;
    onChange: (key: HomeTabKey) => void;
    className?: string;
    contentClassName?: string;
    renderPanel?: (activeKey: HomeTabKey) => ReactElement;
  } & Omit<ViewProps, 'children'>
>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

function SegButton({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: ReactElement;
  selected: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cx(
        'flex-1 flex-row items-center justify-center gap-x-2 py-2 rounded-full',
        selected ? 'bg-white border border-gray300' : 'bg-transparent'
      )}
    >
      <View className={selected ? 'opacity-100' : 'opacity-80'}>{icon}</View>
      <Text className={cx('font-medium', selected ? 'text-brand' : 'text-gray700')}>{label}</Text>
    </Pressable>
  );
}

export default function HomeTabs({
  activeKey,
  onChange,
  className,
  contentClassName,
  renderPanel,
  ...rest
}: HomeTabsProps): ReactElement {
  const isEvents = activeKey === 'events';
  const isMap = activeKey === 'map';

  return (
    <View {...rest} className={cx('w-full', className)}>
      <View className="px-4">
        <View className="flex-row items-center rounded-full bg-gray100 p-1 border border-gray200">
        <SegButton
            label="Map"
            icon={<Feather name="map" size={18} color={isMap ? '#0EA5E9' : '#374151'} />}
            selected={isMap}
            onPress={() => onChange('map')}
          />
          <SegButton
            label="Events"
            icon={<Feather name="grid" size={18} color={isEvents ? '#0EA5E9' : '#374151'} />}
            selected={isEvents}
            onPress={() => onChange('events')}
          />
        </View>
      </View>

      <View className={cx('mt-4 px-4', contentClassName)}>
        {renderPanel ? (
          renderPanel(activeKey)
        ) : (
          <Text className="text-gray600">{activeKey === 'map' ? 'Map coming soon…' : 'Events'}</Text>
        )}
      </View>
    </View>
  );
}
