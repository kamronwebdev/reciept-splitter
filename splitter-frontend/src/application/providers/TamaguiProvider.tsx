// src/application/providers/TamaguiProvider.tsx
import React, { useEffect } from 'react'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { TamaguiProvider as Provider } from '@tamagui/core'
import { PortalProvider } from '@tamagui/portal'
import config from '../../../tamagui.config'
import { useAppTheme, useSyncNativeAppearance } from '@/shared/theme/useAppTheme'

interface TamaguiProviderProps {
  children: React.ReactNode
}

/**
 * Applies the resolved theme (Light / Dark / System) to Tamagui, the status bar and the native root view.
 * "System" follows the phone live, including while the app is open.
 */
export const TamaguiProvider: React.FC<TamaguiProviderProps> = ({ children }) => {
  const { scheme, isDark, colors } = useAppTheme()
  useSyncNativeAppearance()

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined)
  }, [colors.background])

  return (
    <Provider config={config} defaultTheme={scheme}>
      <PortalProvider>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          {children}
        </View>
      </PortalProvider>
    </Provider>
  )
}
