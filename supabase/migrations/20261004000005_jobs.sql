select cron.schedule('cleanup-usage-daily', '15 3 * * *', 'select public.cleanup_usage_daily()');
