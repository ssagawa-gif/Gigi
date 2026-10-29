// The one GiGi logo: "GiGi" in Instrument Serif with three Persimmon dots above the last "i".
// Use this component everywhere so the logo never drifts. The dots are anchored to the
// last "i" (not to the box edge), so they stay in the same spot at every size and in every browser.
export default function Logo({ size = 64, light = false, center = false, style }) {
  const mark = (
    <span className="logo" style={{ fontSize: size, color: light ? '#F5EEE8' : 'var(--cherry)', ...style }}>
      GiG<span className="last-i">i<span className="dots" aria-hidden="true"><i /><i /><i /></span></span>
    </span>
  );
  return center ? <div className="center">{mark}</div> : mark;
}
