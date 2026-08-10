"use client";

import { useMemo, useState } from "react";
import produkty from "@/data/produkty.json";
import { getDiscountRate, getDiscountedPrice, roundUp } from "@/lib/pricing";

type Produkt = {
  sku: string;
  catalogNumber: string;
  name: string;
  package: string;
  price: number | null;
  color: string;
  variety: string;
  vintage: number | null;
  brand: string;
  sugarType: string;
  quality: string;
};

const allProdukty = produkty as Produkt[];
const produktBySku = new Map<string, Produkt>(allProdukty.map((p) => [p.sku, p]));

const BRAND_ORDER = ["LAHOFER", "HANZEL", "WALDBERG", ""];
const BRAND_LABEL: Record<string, string> = {
  LAHOFER: "LAHOFER",
  HANZEL: "HANZEL",
  WALDBERG: "WALDBERG",
  "": "Ostatní",
};

const VARIETY_LIST = [...new Set(allProdukty.map((p) => p.variety).filter(Boolean))].sort((a, b) =>
  a.localeCompare(b, "cs")
);

const COLOR_ORDER = ["bílé", "růžové", "červené", ""];
const COLOR_DOT: Record<string, string> = {
  "bílé": "bg-yellow-200 ring-1 ring-inset ring-yellow-400/50",
  "růžové": "bg-pink-300",
  "červené": "bg-red-700",
};

function sortByColorThenName(items: Produkt[]) {
  return [...items].sort((a, b) => {
    const ai = COLOR_ORDER.indexOf(a.color);
    const bi = COLOR_ORDER.indexOf(b.color);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name, "cs");
  });
}

function groupByBrand(list: Produkt[]) {
  const groups = new Map<string, Produkt[]>();
  for (const p of list) {
    const key = BRAND_ORDER.includes(p.brand) ? p.brand : "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return BRAND_ORDER.filter((key) => groups.has(key)).map((key) => ({
    key,
    label: BRAND_LABEL[key],
    items: sortByColorThenName(groups.get(key)!),
  }));
}

export default function ObjednavkaPage() {
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("Vše");
  const [varietyFilter, setVarietyFilter] = useState<string>("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProdukty.filter((p) => {
      if (brandFilter !== "Vše" && p.brand !== brandFilter) return false;
      if (varietyFilter && p.variety !== varietyFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.variety.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    });
  }, [search, brandFilter, varietyFilter]);

  const groups = useMemo(() => groupByBrand(filtered), [filtered]);

  const selectedItems = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([sku, quantity]) => ({ sku, quantity, product: produktBySku.get(sku)! })),
    [quantities]
  );

  const total = useMemo(
    () =>
      selectedItems.reduce(
        (sum, { product, quantity }) => sum + getDiscountedPrice(product.price ?? 0, product.brand) * quantity,
        0
      ),
    [selectedItems]
  );

  function setQuantity(sku: string, value: number) {
    setQuantities((prev) => ({ ...prev, [sku]: value }));
  }

  function removeItem(sku: string) {
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[sku];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedItems.length === 0) return;
    setStatus("sending");

    const res = await fetch("/api/objednavky", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeName,
        employeeEmail,
        note,
        items: selectedItems.map(({ sku, quantity }) => ({ sku, quantity })),
      }),
    });

    setStatus(res.ok ? "sent" : "error");
  }

  if (status === "sent") {
    return (
      <main className="mx-auto min-h-screen max-w-lg bg-neutral-50 px-4 py-16 text-center text-neutral-900">
        <h1 className="mb-2 text-xl font-semibold">Objednávka odeslána</h1>
        <p className="text-neutral-500">Děkujeme, ozveme se s potvrzením.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-neutral-50 px-4 py-12 text-neutral-900">
      <h1 className="mb-1 text-xl font-semibold">Nová objednávka</h1>
      <p className="mb-6 text-sm text-neutral-500">Objednávka výrobků pro zaměstnance EXBIO.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="Jméno a příjmení"
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            placeholder="E-mail"
            value={employeeEmail}
            onChange={(e) => setEmployeeEmail(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <input
          type="search"
          placeholder="Hledat výrobek…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />

        <div className="flex flex-wrap gap-2">
          {["Vše", ...BRAND_ORDER.filter((b) => b !== "")].map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => setBrandFilter(brand)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                brandFilter === brand
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {brand}
            </button>
          ))}
        </div>

        <select
          value={varietyFilter}
          onChange={(e) => setVarietyFilter(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800"
        >
          <option value="">Všechny odrůdy</option>
          {VARIETY_LIST.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-neutral-200 bg-white">
          {groups.length === 0 && (
            <p className="p-4 text-sm text-neutral-500">Žádný výrobek neodpovídá hledání.</p>
          )}
          {groups.map((group) => (
            <div key={group.key}>
              <div className="sticky top-0 bg-neutral-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {group.label}
              </div>
              <div className="divide-y divide-neutral-100">
                {group.items.map((p) => {
                  const isSelected = (quantities[p.sku] ?? 0) > 0;
                  return (
                    <div
                      key={p.sku}
                      className={`flex items-center gap-3 border-l-4 px-3 py-2 ${
                        isSelected ? "border-l-amber-500 bg-amber-50" : "border-l-transparent"
                      }`}
                    >
                      {p.color && (
                        <span
                          title={p.color}
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_DOT[p.color] ?? "bg-neutral-300"}`}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm ${isSelected ? "font-medium text-neutral-900" : "text-neutral-800"}`}>
                          {p.name} <span className="text-neutral-400">({p.package})</span>
                        </p>
                        {(p.sku || p.catalogNumber || p.quality || p.sugarType) && (
                          <p className="truncate text-xs text-neutral-400">
                            {[p.sku, p.catalogNumber, p.quality, p.sugarType].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <span className="w-24 shrink-0 text-right text-sm">
                        {p.price ? (
                          <>
                            <span className="block text-xs text-neutral-400 line-through">
                              {roundUp(p.price)} Kč
                            </span>
                            <span className="block font-medium text-neutral-700">
                              {getDiscountedPrice(p.price, p.brand)} Kč
                              <span className="ml-1 text-xs font-normal text-emerald-600">
                                -{getDiscountRate(p.brand) * 100}%
                              </span>
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={quantities[p.sku] ?? ""}
                        onChange={(e) => setQuantity(p.sku, Number(e.target.value))}
                        className={`w-16 shrink-0 rounded-lg border px-2 py-1.5 text-right text-sm ${
                          isSelected ? "border-amber-400 bg-white font-medium" : "border-neutral-300"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {selectedItems.length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Vaše objednávka
            </div>
            <div className="divide-y divide-neutral-100">
              {selectedItems.map(({ sku, quantity, product }) => (
                <div key={sku} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-800">
                      {product.name} <span className="text-neutral-400">({product.package})</span>
                    </p>
                    {(product.sku || product.catalogNumber || product.quality || product.sugarType) && (
                      <p className="truncate text-xs text-neutral-400">
                        {[product.sku, product.catalogNumber, product.quality, product.sugarType]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm">
                    {product.price ? (
                      <>
                        <span className="block text-xs text-neutral-400 line-through">
                          {roundUp(product.price)} Kč
                        </span>
                        <span className="block font-medium text-neutral-700">
                          {getDiscountedPrice(product.price, product.brand)} Kč
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(sku, Number(e.target.value))}
                    className="w-16 shrink-0 rounded-lg border border-neutral-300 px-2 py-1.5 text-right text-sm"
                  />
                  <span className="w-20 shrink-0 text-right text-sm font-medium text-neutral-800">
                    {product.price ? `${getDiscountedPrice(product.price, product.brand) * quantity} Kč` : "—"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(sku)}
                    title="Zrušit položku"
                    className="shrink-0 px-1 text-neutral-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className="border-t border-neutral-200 px-3 py-2 text-right text-sm text-neutral-500">
              Vybráno {selectedItems.length}{" "}
              {selectedItems.length === 1 ? "položka" : selectedItems.length < 5 ? "položky" : "položek"} ·
              Orientační cena celkem se slevou: <span className="font-medium text-neutral-800">{total} Kč</span>
            </p>
          </div>
        )}

        <textarea
          placeholder="Poznámka (nepovinné)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          rows={3}
        />

        {status === "error" && (
          <p className="text-sm text-red-600">Odeslání se nezdařilo, zkuste to prosím znovu.</p>
        )}

        <button
          type="submit"
          disabled={status === "sending" || selectedItems.length === 0}
          className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "sending" ? "Odesílám…" : "Odeslat objednávku"}
        </button>
      </form>
    </main>
  );
}
