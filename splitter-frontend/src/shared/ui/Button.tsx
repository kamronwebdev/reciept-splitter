import React from 'react'
import { ActivityIndicator } from 'react-native'
import { Button as TamaguiButton, Text } from 'tamagui'

interface CustomButtonProps {
  title: string
  variant?: 'primary' | 'secondary' | 'outline'
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
        backgroundColor: isDisabled && !loading ? '$gray8' : '#2ECC71',
        color: '#FFFFFF',
      },
      secondary: {
        backgroundColor: '$gray4',
        color: '$gray12',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? '$gray8' : '$green10',
        color: disabled ? '$gray8' : '$green10',
      }
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
      {loading && <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#2ECC71'} style={{ marginRight: 8 }} />}
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