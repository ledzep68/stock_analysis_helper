import { db } from '../config/database';

/**
 * データベース操作のヘルパー関数
 */
export class DatabaseHelper {
  /**
   * トランザクション実行
   */
  static async runTransaction<T>(
    callback: () => Promise<T>
  ): Promise<T> {
    try {
      await db.run('BEGIN TRANSACTION');
      const result = await callback();
      await db.run('COMMIT');
      return result;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * バッチ挿入
   */
  static async batchInsert(
    table: string,
    columns: string[],
    values: any[][],
    batchSize: number = 1000
  ): Promise<void> {
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      const placeholders = batch
        .map(() => `(${columns.map(() => '?').join(',')})`)
        .join(',');
      
      const query = `
        INSERT INTO ${table} (${columns.join(',')}) 
        VALUES ${placeholders}
      `;
      
      const flatValues = batch.flat();
      await db.run(query, flatValues);
    }
  }

  /**
   * 日付フォーマット
   */
  static formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      return date;
    }
    return date.toISOString();
  }

  /**
   * NULL値の処理
   */
  static handleNull<T>(value: T | null | undefined, defaultValue?: T): T | null {
    return value !== null && value !== undefined ? value : (defaultValue ?? null);
  }
}