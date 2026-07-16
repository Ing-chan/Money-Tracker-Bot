import { Share } from 'react-native';
import type { Transaction } from './notificationHandler';

export function generateCsvString(transactions: Transaction[]): string {
  const header = 'Date,Amount (USD),Description,App / Source,Type\n';
  const rows = transactions.map(t => {
    const date = new Date(t.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
    const app = `"${(t.appName || t.source).replace(/"/g, '""')}"`;
    return `${date},${t.amount.toFixed(2)},${desc},${app},${t.source}`;
  });
  return header + rows.join('\n');
}

export async function shareCsv(transactions: Transaction[]): Promise<void> {
  const csv = generateCsvString(transactions);
  await Share.share({
    message: csv,
    title: 'Budget Tracker — Expense Export',
  });
}
