import logging

import httpx

from app.core.config import get_settings
from app.db.models import Order
from app.infra.telegram_client import get_telegram_client

log = logging.getLogger(__name__)


def format_message(order: Order) -> str:
    lines = [
        f"🛒 Новый заказ #{order.id}",
        f"👤 {order.customer_name}, {order.phone}",
        "",
    ]
    for item in order.items:
        subtotal = item.unit_price * item.qty
        if item.qty > 1:
            lines.append(f"• {item.dish_name} × {item.qty} — {subtotal}₽")
        else:
            lines.append(f"• {item.dish_name} — {subtotal}₽")
    lines.append("")
    lines.append(f"💰 Итого: {order.total}₽")
    if order.comment:
        lines.append(f"📝 Комментарий: {order.comment}")
    return "\n".join(lines)


async def notify_owner_safe(order: Order) -> None:
    settings = get_settings()
    if not settings.admin_chat_id:
        log.warning("notify.admin_chat_id_missing", extra={"order_id": order.id})
        return
    try:
        client = get_telegram_client()
        await client.post(
            "/sendMessage",
            json={
                "chat_id": settings.admin_chat_id,
                "text": format_message(order),
                "disable_web_page_preview": True,
            },
        )
    except httpx.HTTPError as exc:
        log.warning("notify.send_failed", extra={"order_id": order.id, "err": str(exc)[:200]})
    except Exception as exc:
        log.warning("notify.unexpected", extra={"order_id": order.id, "err": str(exc)[:200]})
