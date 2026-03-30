import { View } from '@tarojs/components';
import { FC, ReactNode } from 'react';
import './index.scss';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <View className={`card ${className}`} onClick={onClick}>
      {children}
    </View>
  );
};

export { Card };
export type { CardProps };
