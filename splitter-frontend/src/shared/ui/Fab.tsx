// src/shared/ui/Fab.tsx
import { Button } from '@/shared/ui/typography';
import { Plus } from '@tamagui/lucide-icons';

type Props = { onPress: () => void };

export default function Fab({ onPress }: Props) {
  return (
    <Button
      onPress={onPress}
      minWidth={44}
      minHeight={44}
      w={48}
      h={48}
      borderRadius={22}
      backgroundColor="$primary"
      pressStyle={{ opacity: 0.85 }}
      icon={<Plus size={24} color="$onPrimary" />}
      position="absolute"
      bottom={24}
      right={16}
      elevation={4}
      shadowColor="$shadowColor"
      shadowOpacity={0.2}
      shadowRadius={4}
      shadowOffset={{ width: 0, height: 2 }}
      aria-label="Add"
    />
  );
}