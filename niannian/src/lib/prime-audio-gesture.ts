/** 在用户点击手势内调用，解锁移动端 Audio / speechSynthesis */
export function primeAudioInUserGesture(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis?.getVoices();
  const probe = new Audio(
    'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='
  );
  probe.setAttribute('playsinline', 'true');
  probe.volume = 0.01;
  void probe.play().then(() => probe.pause()).catch(() => {});
}
