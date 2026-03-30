import { View, Text } from '@tarojs/components';
import { FC } from 'react';
import './index.scss';

interface ButtonProps {
  children: string;
  type?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const Button: FC<ButtonProps> = ({
  children,
  type = 'primary',
  size = 'medium',
  block = false,
  loading = false,
  disabled = false,
  onClick,
}) => {
  const cls = [
    'btn',
    `btn--${type}`,
    `btn--${size}`,
    block && 'btn--block',
    (loading || disabled) && 'btn--disabled',
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (!loading && !disabled && onClick) {
      onClick();
    }
  };

  return (
    <View className={cls} onClick={handleClick}>
      <Text className="btn__text">{loading ? '加载中...' : children}</Text>
    </View>
  );
};

export { Button };
export type { ButtonProps };
