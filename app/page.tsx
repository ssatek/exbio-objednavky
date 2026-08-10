import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center">
      <Image src="/exbio-logo.png" alt="EXBIO" width={220} height={103} className="mb-6 h-auto w-48" priority />
      <h1 className="mb-2 text-2xl font-semibold">Objednávky pro EXBIO</h1>
      <p className="mb-8 max-w-md text-neutral-500">
        Portál pro zaměstnance EXBIO k objednávání našich výrobků.
      </p>
      <Link
        href="/objednavka"
        className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white"
      >
        Nová objednávka
      </Link>
    </main>
  );
}
