export function BrandMark({ size = 112 }: { size?: number }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}natus-logo.svg`}
      alt="Natus"
      width={size}
      height={size}
      className="mb-4 select-none"
      draggable={false}
    />
  );
}
