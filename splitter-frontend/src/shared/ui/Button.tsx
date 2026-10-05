import React from 'react'
import { ActivityIndicator } from 'react-native'
import { useAppTheme } from '@/shared/theme/useAppTheme'
import { Button as TamaguiButton, Text } from '@/shared/ui/typography';

interface CustomButtonProps {
  title: string
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  /** shows a spinner and blocks presses */
  loading?: boolean
  accessibilityLabel?: string
  onPress?: () => void
}

export const Button: React.FC<CustomButtonProps> = ({ 
  title, 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  accessibilityLabel,
  onPress,
}) => {
  const { colors } = useAppTheme()
  const isDisabled = disabled || loading
  const getStyles = () => {
    const baseStyles = {
      borderRadius: '$4',
      pressStyle: { scale: 0.97 },
    }

    const sizeStyles = {
      small: { height: '$3', paddingHorizontal: '$4' },
      medium: { height: '$4', paddingHorizontal: '$6' },
      large: { height: '$5', paddingHorizontal: '$8' },
    }

    const variantStyles = {
      primary: {
        backgroundColor: isDisabled && !loading ? '$surfaceAlt' : '$primary',
        color: isDisabled && !loading ? '$textSubtle' : '$onPrimary',
      },
      secondary: {
        backgroundColor: '$surfaceAlt',
        color: isDisabled ? '$textSubtle' : '$text',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: isDisabled ? '$borderColor' : '$primary',
        color: isDisabled ? '$textSubtle' : '$primaryText',
      },
      danger: {
        backgroundColor: isDisabled && !loading ? '$surfaceAlt' : '$danger',
        color: isDisabled && !loading ? '$textSubtle' : '$background',
      },
    }

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
    }
  }

  const styles = getStyles()

  return (
    <TamaguiButton
      {...styles}
      disabled={isDisabled}
      onPress={isDisabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      minHeight={44}
    >
      {loading && <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.primary} style={{ marginRight: 8 }} />}
      <Text 
        color={styles.color}
        fontWeight="600"
        fontSize="$4"
      >
        {title}
      </Text>
    </TamaguiButton>
  )
}