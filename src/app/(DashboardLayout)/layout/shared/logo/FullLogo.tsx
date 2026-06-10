"use client";

const FullLogo = () => {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm ring-1 ring-border">
        <img src="/teachery.svg" alt="Teachery" className="h-full w-full object-contain" />
      </span>
      <div className="leading-tight">
        <p className="text-lg font-black text-foreground">Teachery</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Assessment Manager
        </p>
      </div>
    </div>
  );
};

export default FullLogo;
