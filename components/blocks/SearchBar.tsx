// components/blocks/SearchBar.tsx
import React, { type ReactElement } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import TextField, { type TextFieldProps } from '@/components/ui/TextField';

export type SearchBarProps = Readonly<
  {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onSubmit?: () => void;
    onPressFilter?: () => void;
    disabled?: boolean;
    className?: string;
    inputProps?: Omit<TextFieldProps, 'left' | 'right' | 'value' | 'onChangeText' | 'variant' | 'size'>;
  } & Omit<ViewProps, 'children'>
>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search events, organizers, venues...',
  onSubmit,
  onPressFilter,
  disabled = false,
  className,
  inputProps,
  ...rest
}: SearchBarProps): ReactElement {
  return (
    <View {...rest} className={cx(className)}>
      <TextField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onSubmitEditing={onSubmit}
        editable={!disabled}
        variant="filled"
        size="md"
        containerClassName="rounded-2xl bg-gray100"
        inputClassName="text-gray800"
        left={<Feather name="search" size={18} color="#6B7280" />}
        right={
          <Pressable
            accessibilityRole="button"
            onPress={onPressFilter}
            disabled={disabled}
            className="active:opacity-80"
            hitSlop={10}
          >
            <Feather name="filter" size={18} color="#111827" />
          </Pressable>
        }
        {...inputProps}
      />
    </View>
  );
}
