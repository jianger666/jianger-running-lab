import { View } from "@tarojs/components";
import { FC } from "react";
import "./index.scss";

type SkeletonSize = "xs" | "sm" | "md" | "lg";

interface SkeletonProps {
  size?: SkeletonSize;
  className?: string;
  width?: string;
  height?: string;
}

const Skeleton: FC<SkeletonProps> = ({ size = "md", className = "", width, height }) => {
  const style = { ...(width && { width }), ...(height && { height }) };
  return (
    <View
      className={`skeleton skeleton--${size} ${className}`}
      style={style}
    />
  );
};

export { Skeleton };
export type { SkeletonProps };
