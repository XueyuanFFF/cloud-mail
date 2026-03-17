import { sqliteTable, text, integer} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const account = sqliteTable('account', {
	accountId: integer('account_id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull(),
	name: text('name').notNull().default(''),
	status: integer('status').default(0).notNull(),
	tokenVersion: integer('token_version').default(1).notNull(),
	tokenStatus: integer('token_status').default(0).notNull(),
	tokenRotatedAt: text('token_rotated_at'),
	tokenRotatedBy: integer('token_rotated_by'),
	latestEmailTime: text('latest_email_time'),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`),
	userId: integer('user_id').notNull(),
	allReceive: integer('all_receive').default(0).notNull(),
	isDel: integer('is_del').default(0).notNull(),
});
export default account
