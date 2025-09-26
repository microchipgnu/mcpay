import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
}

export const StopIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <svg
      height={size}
      viewBox="0 0 16 16"
      width={size}
      style={{ color: 'currentcolor' }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 3H13V13H3V3Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const CheckCircleIcon: React.FC<IconProps> = ({
  size = 16,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <g clipPath="url(#clip0_check_circle)">
      <path
        d="M7 0.515625C10.5803 0.515889 13.4832 3.41967 13.4834 7C13.4831 10.5803 10.5803 13.4831 7 13.4834C3.41967 13.4832 0.515889 10.5803 0.515625 7C0.515801 3.41961 3.41961 0.515801 7 0.515625ZM9.20996 5.37402C8.95612 5.12018 8.54388 5.12018 8.29004 5.37402L6.41602 7.24805L5.70996 6.54102L5.25 7.00098L4.79004 7.45996L5.95703 8.62695C6.21076 8.88041 6.62218 8.88031 6.87598 8.62695L9.20996 6.29395C9.46372 6.04019 9.46356 5.62788 9.20996 5.37402ZM5.70996 6.54102C5.45612 6.28717 5.04388 6.28717 4.79004 6.54102C4.53671 6.79478 4.53666 7.20623 4.79004 7.45996L5.70996 6.54102Z"
      />
    </g>
    <defs>
      <clipPath id="clip0_check_circle">
        <rect width="14" height="14" fill="white" />
      </clipPath>
    </defs>
  </svg>
);