class VoiceRecognizer:
    """Optional speech recognition wrapper.

    The desktop app remains usable without this dependency by accepting typed
    commands in the same input box.
    """

    def listen_once(self) -> str:
        try:
            import speech_recognition as sr
        except ImportError as exc:
            raise RuntimeError("未安装 SpeechRecognition，请先使用文字输入或安装语音依赖。") from exc

        recognizer = sr.Recognizer()
        with sr.Microphone() as source:
            recognizer.adjust_for_ambient_noise(source, duration=0.4)
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=8)
        return recognizer.recognize_google(audio, language="zh-CN")
