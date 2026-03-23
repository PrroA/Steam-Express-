import { render, screen, fireEvent } from '@testing-library/react';
import { AddGamePanel } from '../components/admin/AddGamePanel';

describe('AddGamePanel', () => {
  const baseForm = {
    name: '',
    price: '',
    description: '',
    image: '',
    preview: '',
    imageUrlError: '',
    uploadingImage: false,
  };

  const setup = (overrides = {}) => {
    const onFieldChange = jest.fn();
    const onImageUrlChange = jest.fn();
    const onImageFileChange = jest.fn();
    const onSubmit = jest.fn();

    render(
      <AddGamePanel
        form={{ ...baseForm, ...overrides }}
        onFieldChange={onFieldChange}
        onImageUrlChange={onImageUrlChange}
        onImageFileChange={onImageFileChange}
        onSubmit={onSubmit}
      />
    );

    return { onFieldChange, onImageUrlChange, onImageFileChange, onSubmit };
  };

  it('renders core fields and submit button', () => {
    setup();

    expect(screen.getByText('新增商品')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('遊戲名稱')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('價格（例如：59.99）')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('遊戲描述')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('封面圖片 URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加遊戲' })).toBeInTheDocument();
    expect(screen.queryByAltText('封面預覽')).not.toBeInTheDocument();
  });

  it('triggers field change handlers when user types', () => {
    const { onFieldChange, onImageUrlChange } = setup();

    fireEvent.change(screen.getByPlaceholderText('遊戲名稱'), {
      target: { value: 'Cyberpunk 2077' },
    });
    fireEvent.change(screen.getByPlaceholderText('價格（例如：59.99）'), {
      target: { value: '59.99' },
    });
    fireEvent.change(screen.getByPlaceholderText('遊戲描述'), {
      target: { value: 'Open world RPG' },
    });
    fireEvent.change(screen.getByPlaceholderText('封面圖片 URL'), {
      target: { value: 'https://example.com/cp2077.jpg' },
    });

    expect(onFieldChange).toHaveBeenCalledWith('name', 'Cyberpunk 2077');
    expect(onFieldChange).toHaveBeenCalledWith('price', '59.99');
    expect(onFieldChange).toHaveBeenCalledWith('description', 'Open world RPG');
    expect(onImageUrlChange).toHaveBeenCalledWith('https://example.com/cp2077.jpg');
  });

  it('passes selected file to onImageFileChange', () => {
    const { onImageFileChange } = setup();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image-bytes'], 'cover.png', { type: 'image/png' });

    expect(fileInput).toBeTruthy();
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(onImageFileChange).toHaveBeenCalledWith(file);
  });

  it('calls onSubmit when submit button clicked', () => {
    const { onSubmit } = setup();

    fireEvent.click(screen.getByRole('button', { name: '添加遊戲' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders preview image and handles image load/error callbacks', () => {
    const { onFieldChange } = setup({ preview: 'https://example.com/cover.jpg' });
    const preview = screen.getByAltText('封面預覽');

    fireEvent.error(preview);
    expect(onFieldChange).toHaveBeenCalledWith('imageUrlError', '圖片載入失敗，請確認網址可公開存取');
  });

  it('shows uploading and error states', () => {
    setup({ uploadingImage: true, imageUrlError: '圖片格式錯誤' });

    expect(screen.getByText('圖片處理中...')).toBeInTheDocument();
    expect(screen.getByText('圖片格式錯誤')).toBeInTheDocument();
  });
});
