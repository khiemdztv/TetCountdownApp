import * as React from 'react';

/*
 * Bản thay thế nhẹ cho components/ui/button.tsx của gói gốc.
 *
 * VÌ SAO PHẢI THAY:
 *   Bản gốc dùng @radix-ui/react-slot, class-variance-authority và rất nhiều
 *   class Tailwind (bg-primary, hover:bg-primary/90, h-9, px-4...).
 *   App đích không có Tailwind nên phải dịch sang class CSS thuần.
 *
 * Bản này giữ nguyên API (variant, size, asChild) nhưng sinh ra class
 * CSS thường, có định nghĩa trong games-extra.css.
 */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const cls = ['gb-btn', `gb-btn-${variant}`, `gb-size-${size}`, className]
      .filter(Boolean)
      .join(' ');

    // asChild: bọc phần tử con (bản gốc dùng Radix Slot).
    // Ở đây chỉ ghép class vào phần tử con, đủ cho các chỗ gọi trong gói.
    if (asChild && React.isValidElement(props.children)) {
      const child = props.children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: [cls, child.props.className].filter(Boolean).join(' '),
      });
    }

    return <button className={cls} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export const buttonVariants = () => '';
