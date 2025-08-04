import { ElMessage } from 'element-plus';

type MessageType = 'success' | 'warning' | 'info' | 'error';

interface CustomMessageOptions {
  title: string;
  description?: string;
  type?: MessageType;
  duration?: number;
  showClose?: boolean;
}

export function useCustomMessage() {
  const showMessage = ({
    title,
    description = '',
    type = 'info',
    duration = 3000,
  }: CustomMessageOptions) => {
    ElMessage({
      dangerouslyUseHTMLString: true,
      message: `
            <div>
                <div style="padding-bottom:8px;font-weight:600;">${title}</div>
                <div style="font-size:12px;">${description}</div>
            </div>
      `,
      type,
      duration,
    });
  };

  return { showMessage };
}
