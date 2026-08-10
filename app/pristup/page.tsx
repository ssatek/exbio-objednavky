"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PristupPage() {
  return (
    <Suspense>
      <PristupForm />
    </Suspense>
  );
}

function PristupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/pristup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, from: searchParams.get("from") }),
    });

    setLoading(false);
    if (!res.ok) {
      setError(true);
      return;
    }
    const data = await res.json();
    router.push(data.redirect || "/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <h1 className="mb-1 text-xl font-semibold">Objednávky EXBIO</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Zadejte přístupový kód, který jste obdrželi od dodavatele.
        </p>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Přístupový kód"
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          autoFocus
        />
        {error && (
          <p className="mb-3 text-sm text-red-600">Nesprávný kód, zkuste to znovu.</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Ověřuji…" : "Pokračovat"}
        </button>
      </form>
    </main>
  );
}
