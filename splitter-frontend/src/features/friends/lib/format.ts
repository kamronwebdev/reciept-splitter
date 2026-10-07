/** "@user1234" style handle shown under names (uniqueIds are stored like "USER#1234"). */
export function handleOf(uniqueId?: string | null): string {
  return uniqueId ? `@${uniqueId.toLowerCase().replace('user#', 'user')}` : '';
}
