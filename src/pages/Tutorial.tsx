import { useState, useEffect } from 'react';
import { videosService } from '../lib/api';
import { VideoPlayer } from '../components/videos/VideoPlayer';
import { FileVideo, PlayCircle } from 'lucide-react';

interface VideoFile {
    filename: string;
    size: number;
    lastModified: string;
}

export function Tutorial() {
    const [videos, setVideos] = useState<VideoFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async () => {
        try {
            const list = await videosService.getList();
            setVideos(list);
        } catch (error) {
            console.error('Erro ao carregar vídeos:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatSize = (bytes: number) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Tutoriais e Treinamentos</h1>
                <p className="text-gray-500">Vídeos explicativos para administradores do sistema.</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map((video) => (
                        <div key={video.filename} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="aspect-video bg-gray-900 flex items-center justify-center relative group cursor-pointer" onClick={() => setSelectedVideo(video.filename)}>
                                {selectedVideo === video.filename ? (
                                    <VideoPlayer filename={video.filename} title={video.filename.replace('.mp4', '')} />
                                ) : (
                                    <>
                                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
                                        <PlayCircle className="w-12 h-12 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all z-10" />
                                    </>
                                )}
                            </div>

                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-50 rounded-lg">
                                        <FileVideo className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 line-clamp-1" title={video.filename}>
                                            {video.filename}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Tamanho: {formatSize(video.size)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {videos.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                            <FileVideo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Nenhum vídeo disponível no momento.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
