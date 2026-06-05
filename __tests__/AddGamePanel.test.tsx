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
    const onGenerateAiCopy = jest.fn();
    const onApplyAiShortDescription = jest.fn();
    const onAppendAiSellingPoints = jest.fn();
    const onApplyAiSeoTitle = jest.fn();

    render(
      <AddGamePanel
        form={{ ...baseForm, ...overrides }}
        onFieldChange={onFieldChange}
        onImageUrlChange={onImageUrlChange}
        onImageFileChange={onImageFileChange}
        onSubmit={onSubmit}
        aiDraft={null}
        aiGenerating={false}
        onGenerateAiCopy={onGenerateAiCopy}
        onApplyAiShortDescription={onApplyAiShortDescription}
        onAppendAiSellingPoints={onAppendAiSellingPoints}
        onApplyAiSeoTitle={onApplyAiSeoTitle}
      />
    );

    return { onFieldChange, onImageUrlChange, onImageFileChange, onSubmit, onGenerateAiCopy };
  };

  it('renders core fields and submit button', () => {
    setup();

    expect(screen.getByRole('heading', { name: '新增商品' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('商品名稱')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('價格，例如 59.99')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('商品描述')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('商品圖片 URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增商品' })).toBeInTheDocument();
    expect(screen.queryByAltText('商品圖片預覽')).not.toBeInTheDocument();
  });

  it('triggers field change handlers when user types', () => {
    const { onFieldChange, onImageUrlChange } = setup();

    fireEvent.change(screen.getByPlaceholderText('商品名稱'), {
      target: { value: 'Cyberpunk 2077' },
    });
    fireEvent.change(screen.getByPlaceholderText('價格，例如 59.99'), {
      target: { value: '59.99' },
    });
    fireEvent.change(screen.getByPlaceholderText('商品描述'), {
      target: { value: 'Open world RPG' },
    });
    fireEvent.change(screen.getByPlaceholderText('商品圖片 URL'), {
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

    fireEvent.click(screen.getByRole('button', { name: '新增商品' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders preview image and handles image load/error callbacks', () => {
    const { onFieldChange } = setup({ preview: 'https://example.com/cover.jpg' });
    const preview = screen.getByAltText('商品圖片預覽');

    fireEvent.error(preview);
    expect(onFieldChange).toHaveBeenCalledWith('imageUrlError', '圖片無法載入，請確認網址或重新上傳。');

  });

  it('shows uploading and error states', () => {
    setup({ uploadingImage: true, imageUrlError: '圖片格式錯誤' });

    expect(screen.getByText('圖片上傳中...')).toBeInTheDocument();
    expect(screen.getByText('圖片格式錯誤')).toBeInTheDocument();
  });

  it('triggers AI copy generation', () => {
    const { onGenerateAiCopy } = setup();

    fireEvent.click(screen.getByRole('button', { name: '產生商品文案' }));

    expect(onGenerateAiCopy).toHaveBeenCalledTimes(1);
  });
});
