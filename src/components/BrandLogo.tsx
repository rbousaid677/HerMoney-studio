export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width={compact ? 26 : 30}
        height={compact ? 26 : 30}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1.5"
          y="1.5"
          width="33"
          height="33"
          rx="8"
          fill="#F7EAEB"
          stroke="#C59B43"
          strokeWidth="1.5"
        />
        <path
          d="M11 10.5V25.5M25 10.5V25.5M11 18H25"
          stroke="#8E3F4F"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="18" cy="18" r="2.75" fill="#C59B43" />
      </svg>
      <span className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[#1F1B1C]">
        HerMoney <span className="text-[#8E3F4F] font-normal italic">Studio</span>
      </span>
    </span>
  );
}
