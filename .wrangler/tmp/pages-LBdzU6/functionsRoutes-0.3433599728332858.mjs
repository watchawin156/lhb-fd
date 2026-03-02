import { onRequestDelete as __api_transactions__id__ts_onRequestDelete } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\transactions\\[id].ts"
import { onRequestOptions as __api_transactions__id__ts_onRequestOptions } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\transactions\\[id].ts"
import { onRequestPut as __api_transactions__id__ts_onRequestPut } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\transactions\\[id].ts"
import { onRequestDelete as __api_audit_logs_ts_onRequestDelete } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\audit-logs.ts"
import { onRequestGet as __api_audit_logs_ts_onRequestGet } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\audit-logs.ts"
import { onRequestOptions as __api_audit_logs_ts_onRequestOptions } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\audit-logs.ts"
import { onRequestPost as __api_audit_logs_ts_onRequestPost } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\audit-logs.ts"
import { onRequestGet as __api_backup_ts_onRequestGet } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\backup.ts"
import { onRequestOptions as __api_backup_ts_onRequestOptions } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\backup.ts"
import { onRequestPost as __api_backup_ts_onRequestPost } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\backup.ts"
import { onRequestPut as __api_backup_ts_onRequestPut } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\backup.ts"
import { onRequestGet as __api_settings_ts_onRequestGet } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\settings.ts"
import { onRequestOptions as __api_settings_ts_onRequestOptions } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\settings.ts"
import { onRequestPost as __api_settings_ts_onRequestPost } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\settings.ts"
import { onRequestOptions as __api_telegram_send_ts_onRequestOptions } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\telegram-send.ts"
import { onRequestPost as __api_telegram_send_ts_onRequestPost } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\telegram-send.ts"
import { onRequestGet as __api_transactions_ts_onRequestGet } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\transactions.ts"
import { onRequestOptions as __api_transactions_ts_onRequestOptions } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\transactions.ts"
import { onRequestPost as __api_transactions_ts_onRequestPost } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\transactions.ts"
import { onRequest as __api__middleware_ts_onRequest } from "C:\\Users\\pc wind\\Documents\\ระบบการเงิน\\เอกสาร\\school-finance-dashboard\\functions\\api\\_middleware.ts"

export const routes = [
    {
      routePath: "/api/transactions/:id",
      mountPath: "/api/transactions",
      method: "DELETE",
      middlewares: [],
      modules: [__api_transactions__id__ts_onRequestDelete],
    },
  {
      routePath: "/api/transactions/:id",
      mountPath: "/api/transactions",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_transactions__id__ts_onRequestOptions],
    },
  {
      routePath: "/api/transactions/:id",
      mountPath: "/api/transactions",
      method: "PUT",
      middlewares: [],
      modules: [__api_transactions__id__ts_onRequestPut],
    },
  {
      routePath: "/api/audit-logs",
      mountPath: "/api",
      method: "DELETE",
      middlewares: [],
      modules: [__api_audit_logs_ts_onRequestDelete],
    },
  {
      routePath: "/api/audit-logs",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_audit_logs_ts_onRequestGet],
    },
  {
      routePath: "/api/audit-logs",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_audit_logs_ts_onRequestOptions],
    },
  {
      routePath: "/api/audit-logs",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_audit_logs_ts_onRequestPost],
    },
  {
      routePath: "/api/backup",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_backup_ts_onRequestGet],
    },
  {
      routePath: "/api/backup",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_backup_ts_onRequestOptions],
    },
  {
      routePath: "/api/backup",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_backup_ts_onRequestPost],
    },
  {
      routePath: "/api/backup",
      mountPath: "/api",
      method: "PUT",
      middlewares: [],
      modules: [__api_backup_ts_onRequestPut],
    },
  {
      routePath: "/api/settings",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_settings_ts_onRequestGet],
    },
  {
      routePath: "/api/settings",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_settings_ts_onRequestOptions],
    },
  {
      routePath: "/api/settings",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_settings_ts_onRequestPost],
    },
  {
      routePath: "/api/telegram-send",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_telegram_send_ts_onRequestOptions],
    },
  {
      routePath: "/api/telegram-send",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_telegram_send_ts_onRequestPost],
    },
  {
      routePath: "/api/transactions",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_transactions_ts_onRequestGet],
    },
  {
      routePath: "/api/transactions",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_transactions_ts_onRequestOptions],
    },
  {
      routePath: "/api/transactions",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_transactions_ts_onRequestPost],
    },
  {
      routePath: "/api",
      mountPath: "/api",
      method: "",
      middlewares: [__api__middleware_ts_onRequest],
      modules: [],
    },
  ]