#!/usr/bin/env python3
import sys
import json
import os

venv_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "..",
    "yt-transcript", ".venv", "lib", "python3.14", "site-packages"
)
sys.path.insert(0, venv_path)

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import YouTubeTranscriptApiException


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Video ID required"}))
        sys.exit(1)

    video_id = sys.argv[1]

    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)

        result = {
            "video_id": transcript.video_id,
            "language": transcript.language,
            "language_code": transcript.language_code,
            "is_generated": transcript.is_generated,
            "snippets": [
                {
                    "text": snippet.text,
                    "start": snippet.start,
                    "duration": snippet.duration
                }
                for snippet in transcript
            ]
        }

        print(json.dumps(result))
    except YouTubeTranscriptApiException as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
