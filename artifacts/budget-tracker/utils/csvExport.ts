import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import type { Transaction } from './notificationHandler';

export function generateCsvString(transactions: Transaction[], currencyCode: string): string {
  const header = `Date,Amount (${currencyCode}),Description,App / Source,Type\n`;
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

export async function shareCsv(transactions: Transaction[], currencyCode: string): Promise<void> {
  const csv = generateCsvString(transactions, currencyCode);
  const fileUri = `${FileSystem.cacheDirectory}budget-tracker-export.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Transactions (CSV)',
      UTI: 'public.comma-separated-values-text',
    });
  } else {
    // Fallback for platforms without a native share sheet (e.g. web)
    await Share.share({ message: csv });
  }
}

function generateHtmlReport(transactions: Transaction[], currencyCode: string): string {
  const rows = transactions
    .map(t => {
      const date = new Date(t.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const desc = (t.description || '').replace(/</g, '&lt;');
      const app = (t.appName || t.source).replace(/</g, '&lt;');
      const amountColor = t.type === 'income' ? '#12B76A' : '#111827';
      const sign = t.type === 'income' ? '+' : '';
      return `<tr>
        <td>${date}</td>
        <td>${desc}</td>
        <td>${app}</td>
        <td style="color:${amountColor}; text-align:right;">${sign}${t.amount.toFixed(2)} ${currencyCode}</td>
      </tr>`;
    })
    .join('');

  const total = transactions
    .filter(t => t.type !== 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          p.meta { color: #6b7280; font-size: 12px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { padding: 8px 6px; font-size: 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
          th { color: #6b7280; font-weight: 600; }
          tfoot td { font-weight: 700; border-top: 2px solid #111827; border-bottom: none; }
        </style>
      </head>
      <body>
        <h1>Budget Tracker — Expense Report</h1>
        <p class="meta">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}</p>
        <table>
          <thead>
            <tr><th>Date</th><th>Description</th><th>Source</th><th style="text-align:right;">Amount</th></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td colspan="3">Total spent</td><td style="text-align:right;">${total.toFixed(2)} ${currencyCode}</td></tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;
}

export async function sharePdf(transactions: Transaction[], currencyCode: string): Promise<void> {
  const html = generateHtmlReport(transactions, currencyCode);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export Transactions (PDF)',
      UTI: 'com.adobe.pdf',
    });
  }
}
