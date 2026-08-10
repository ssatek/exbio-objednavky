import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDiscountRate, getDiscountedPrice, roundUp } from "@/lib/pricing";
import { buildOrderExcel } from "@/lib/orderExcel";
import { Resend } from "resend";

type OrderItem = { sku: string; quantity: number };

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { employeeName, employeeEmail, note, items } = body as {
    employeeName: string;
    employeeEmail: string;
    note?: string;
    items: OrderItem[];
  };

  if (!employeeName || !employeeEmail || !items?.length) {
    return NextResponse.json({ error: "Chybí povinné údaje." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, sku, name, package, price, brand")
    .in(
      "sku",
      items.map((item) => item.sku)
    );

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  const productBySku = new Map(products.map((p) => [p.sku, p]));
  const productIdBySku = new Map(products.map((p) => [p.sku, p.id]));
  const missing = items.filter((item) => !productIdBySku.has(item.sku));
  if (missing.length) {
    return NextResponse.json(
      { error: `Neznámé výrobky: ${missing.map((m) => m.sku).join(", ")}` },
      { status: 400 }
    );
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ employee_name: employeeName, employee_email: employeeEmail, note })
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    items.map((item) => ({
      order_id: order.id,
      product_id: productIdBySku.get(item.sku),
      quantity: item.quantity,
    }))
  );

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const notifyEmail = process.env.ORDER_NOTIFY_EMAIL;
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL || "EXBIO objednávky <onboarding@resend.dev>";

    let total = 0;
    const itemLines = items.map((item) => {
      const p = productBySku.get(item.sku);
      const unitPrice = roundUp(p?.price ?? 0);
      const unitDiscounted = getDiscountedPrice(p?.price ?? 0, p?.brand ?? "");
      const lineTotal = unitDiscounted * item.quantity;
      total += lineTotal;
      const rate = getDiscountRate(p?.brand ?? "") * 100;
      return `  ${item.quantity}x  ${p?.name ?? item.sku} (${p?.package ?? "?"})  —  ${lineTotal} Kč  (${unitDiscounted} Kč/ks se slevou ${rate}%, běžná cena ${unitPrice} Kč/ks)`;
    });

    if (notifyEmail) {
      try {
        const excelBuffer = await buildOrderExcel(
          items.map((item) => {
            const p = productBySku.get(item.sku);
            return { sku: item.sku, name: p?.name ?? item.sku, quantity: item.quantity, brand: p?.brand ?? "" };
          })
        );

        await resend.emails.send({
          from,
          to: notifyEmail,
          subject: `Nová objednávka od ${employeeName} (EXBIO)`,
          text: [
            `Zaměstnanec: ${employeeName} (${employeeEmail})`,
            `Poznámka: ${note || "—"}`,
            "",
            "Položky:",
            ...itemLines,
            "",
            `Celkem se slevou: ${total} Kč`,
            "",
            `ID objednávky: ${order.id}`,
          ].join("\n"),
          attachments: [
            {
              filename: `objednavka-${order.id}.xlsx`,
              content: excelBuffer,
            },
          ],
        });
      } catch (err) {
        console.error("Odeslání interní notifikace selhalo:", err);
      }
    }

    try {
      await resend.emails.send({
        from,
        to: employeeEmail,
        subject: "Shrnutí vaší objednávky — EXBIO",
        text: [
          `Dobrý den ${employeeName},`,
          "",
          "děkujeme za objednávku, tady je její shrnutí:",
          "",
          ...itemLines,
          "",
          `Celkem: ${total} Kč`,
          ...(note ? ["", `Poznámka: ${note}`] : []),
          "",
          `ID objednávky: ${order.id}`,
          "",
          "Vyřízení proběhne mimo tento portál, ozveme se s potvrzením.",
        ].join("\n"),
      });
    } catch (err) {
      console.error("Odeslání shrnutí zaměstnanci selhalo:", err);
    }
  }

  return NextResponse.json({ ok: true, orderId: order.id });
}
