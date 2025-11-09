// src/components/ui/TextField.tsx
import React, { type ReactElement, useMemo } from 'react';
import {
  TextInput,
  View,
  Text,
  type TextInputProps,
  type ViewProps,
  type AccessibilityRole,
} from 'react-native';

type TextFieldVariant = 'outline' | 'filled';
type TextFieldSize = 'sm' | 'md' | 'lg';
type TextFieldState = 'default' | 'error' | 'success';

export type TextFieldProps = Readonly<
  {
    label?: string;
    helperText?: string;         // neutral/help text (shown when no errorText)
    errorText?: string;          // if provided, component is treated as error state
    variant?: TextFieldVariant;
    size?: TextFieldSize;
    state?: TextFieldState;      // overrides derived state when you need explicit control
    left?: ReactElement | null;  // left accessory (icon, badge, etc.)
    right?: ReactElement | null; // right accessory
    containerClassName?: string; // wrapper <View> classes
    inputClassName?: string;     // <TextInput> classes
    labelClassName?: string;     // label <Text> classes
    helperClassName?: string;    // helper/error <Text> classes
  } & Omit<TextInputProps, 'children'>
>;

const cx = (...classes: ReadonlyArray<string | null | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

const sizeMap: Record<
  TextFieldSize,
  { containerPad: string; height: string; text: string; accessory: string }
> = {
  sm: { containerPad: 'px-3', height: 'h-10', text: 'text-sm', accessory: 'gap-x-2' },
  md: { containerPad: 'px-4', height: 'h-12', text: 'text-base', accessory: 'gap-x-2.5' },
  lg: { containerPad: 'px-5', height: 'h-14', text: 'text-lg', accessory: 'gap-x-3' },
};

const variantBase: Record<TextFieldVariant, string> = {
  outline: 'bg-white border border-border',
  filled: 'bg-gray50 border border-border',
};

const stateBorders: Record<TextFieldState, string> = {
  default: 'border-border',
  error: 'border-danger',
  success: 'border-success',
};

const stateText: Record<TextFieldState, string> = {
  default: 'text-gray600',
  error: 'text-danger',
  success: 'text-success',
};

export function TextField({
  label,
  helperText,
  errorText,
  variant = 'outline',
  size = 'md',
  state: stateProp,
  left,
  right,
  containerClassName,
  inputClassName,
  labelClassName,
  helperClassName,
  editable = true,
  keyboardAppearance,
  ...rest
}: TextFieldProps): ReactElement {
  const a11yRole: AccessibilityRole = 'text';

  const derivedState: TextFieldState = useMemo(() => {
    if (stateProp) return stateProp;
    if (errorText && errorText.length > 0) return 'error';
    return 'default';
  }, [stateProp, errorText]);

  const sizeTokens = sizeMap[size];
  const borderColor = stateBorders[derivedState];

  return (
    <View className={cx('gap-y-1', containerClassName)}>
      {label ? (
        <Text className={cx('text-sm text-gray700', labelClassName)} accessibilityRole={a11yRole}>
          {label}
        </Text>
      ) : null}

      <View
        className={cx(
          'flex-row items-center rounded-2xl',
          sizeTokens.height,
          sizeTokens.containerPad,
          variantBase[variant],
          borderColor,
          editable ? 'opacity-100' : 'opacity-60'
        )}
      >
        {left ? <View className={cx('mr-2')}>{left}</View> : null}

        <TextInput
          // RN props
          editable={editable}
          keyboardAppearance={keyboardAppearance ?? 'light'}
          // NativeWind classes
          className={cx(
            'flex-1 text-black',
            sizeTokens.text,
            'placeholder:text-gray400',
            inputClassName
          )}
          placeholderTextColor="#9CA3AF"
          {...rest}
        />

        {right ? <View className={cx('ml-2')}>{right}</View> : null}
      </View>

      {errorText ? (
        <Text className={cx('text-xs', stateText.error, helperClassName)} accessibilityRole={a11yRole}>
          {errorText}
        </Text>
      ) : helperText ? (
        <Text className={cx('text-xs text-gray600', helperClassName)} accessibilityRole={a11yRole}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

export default TextField;
