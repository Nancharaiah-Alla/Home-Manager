// Device identification helper for single-device login protection

export function getDeviceId(): string {
  const key = 'hm_device_id';
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}

export function getDeviceName(): string {
  const userAgent = navigator.userAgent || '';
  let browser = 'Browser';
  let os = 'Device';

  // Detect Browser
  if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Edg/')) {
    browser = 'Edge';
  } else if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  }

  // Detect OS
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS Device';
  } else if (userAgent.includes('Android')) {
    os = 'Android Device';
  } else if (userAgent.includes('Mac OS') || userAgent.includes('Macintosh')) {
    os = 'macOS';
  } else if (userAgent.includes('Windows')) {
    os = 'Windows PC';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  }

  return `${browser} on ${os}`;
}

export function rotateDeviceIdForSimulation(): string {
  const newId = 'dev_sim_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
  localStorage.setItem('hm_device_id', newId);
  return newId;
}
