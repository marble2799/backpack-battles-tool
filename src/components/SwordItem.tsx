import React from 'react';
import { GiBroadsword } from 'react-icons/gi'; // Game-icons.netｋから画像を持ってくる

interface SwordItemProps {
    size?: number; // ピクセルサイズ
    color?: string; // 色コード
}

export const SwordItem: React.FC<SwordItemProps> = ({size = 64, color = "white"}) => {
    return (
        <div
        className = "flex flex-col items-center justify-center border-2 border-gray-500 rounded p-2 bg-gray-800"
        style={{width: '100px', height: '100px'}}
        >
            {/* アイコンの表示 */}
            <GiBroadsword size={size} color={color} />
            <span className="text-xs mt-1">木の剣</span>
        </div>
    );
};