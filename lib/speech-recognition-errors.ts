export function getSpeechRecognitionErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'no-speech':
      return '未检测到语音，请靠近麦克风后重试。'
    case 'audio-capture':
      return '未检测到可用麦克风，请检查系统输入设备。'
    case 'not-allowed':
      return '麦克风权限被拒绝。请在浏览器地址栏左侧的站点权限中允许麦克风，然后刷新页面重试。'
    case 'service-not-allowed':
      return '浏览器语音识别服务不可用。请使用 Chrome 或 Edge，并确认当前页面为 localhost 或 HTTPS。'
    case 'network':
      return '浏览器语音识别服务网络不可达。可换用 Edge/Chrome 或调整网络环境；也可以直接使用下方文字输入继续让 DeepSeek 解析日程。'
    case 'aborted':
      return '语音识别已中断，请重新点击麦克风。'
    case 'language-not-supported':
      return '当前浏览器不支持中文语音识别，请使用文字输入继续。'
    default:
      return `语音识别错误: ${errorCode}`
  }
}
