import { useState, useRef, useEffect } from 'react';
import { videosService } from '../../lib/api';
import { Loader2, Maximize, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../lib/utils';

interface VideoPlayerProps {
    filename: string;
    title?: string;
}

export function VideoPlayer({ filename, title }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const streamUrl = videosService.getStreamUrl(filename);

    useEffect(() => {
        setLoading(true);
        setError(null);
    }, [filename]);

    const handleLoadedData = () => {
        setLoading(false);
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleError = () => {
        setLoading(false);
        setError('Erro ao carregar o vídeo.');
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const total = videoRef.current.duration;
            setProgress((current / total) * 100);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (videoRef.current) {
            const time = (value / 100) * videoRef.current.duration;
            videoRef.current.currentTime = time;
            setProgress(value);
        }
    };

    const toggleFullscreen = () => {
        if (videoRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                videoRef.current.requestFullscreen();
            }
        }
    };

    return (
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg group">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                    <p className="text-white text-sm">{error}</p>
                </div>
            )}

            <video
                ref={videoRef}
                src={streamUrl}
                className="w-full h-full object-contain"
                onLoadedData={handleLoadedData}
                onError={handleError}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                onClick={togglePlay}
            />

            {/* Custom Controls Interface - simplified */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                {/* Progress Bar */}
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500 hover:h-2 transition-all"
                />

                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="hover:text-green-400 transition-colors">
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        <span className="text-xs font-medium">{title || filename}</span>
                    </div>

                    <button onClick={toggleFullscreen} className="hover:text-green-400 transition-colors">
                        <Maximize className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
