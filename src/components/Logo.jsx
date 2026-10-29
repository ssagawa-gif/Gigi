// The one GiGi logo: "GiGi" in Instrument Serif with three Persimmon dots above the last "i".
// Use this component everywhere so the logo never drifts. Dots scale with the font size.
export default function Logo({ size = 64, light = false, center = false, style }) {
  const mark = (
    <span className="logo" style={{ fontSize: size, color: light ? '#F5EEE8' : 'var(--cherry)', ...style }}>
      GiGi<span className="dots" aria-hidden="true"><i /><i /><i /></span>
    </span>
  );
  return center ? <div className="center">{mark}</div> : mark;
}
