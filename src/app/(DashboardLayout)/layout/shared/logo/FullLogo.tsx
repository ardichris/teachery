"use client";

const FullLogo = () => {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
        T
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
