// src/shared/ui/Card.tsx
import React from 'react';
import { YStack } from 'tamagui';

interface CardProps {
  children: React.ReactNode;
  padding?: string;
}

/** Plain rounded surface on the grouped background (no borders or heavy shadows, iOS style). */
export const Card: React.FC<CardProps> = ({ children, padding = '$4' }) => (
  <YStack backgroundColor="$surface" borderRadius={14} padding={padding}>
    {children}
  </YStack>
);
