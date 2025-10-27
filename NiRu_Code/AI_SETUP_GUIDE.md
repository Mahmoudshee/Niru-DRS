# AI Policy Assistant Setup Guide

## 🚀 Quick Setup

### 1. Create Environment File
Create a `.env` file in your `Niru-DRS/NiRu_Code/` directory with:

```env
# Hugging Face API Key for AI Policy Assistant
VITE_HF_API_KEY=your_hugging_face_api_key_here
```

### 2. Get Your Hugging Face API Key
1. Go to [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Create a new token with "Read" permissions
3. Copy the token and replace `your_hugging_face_api_key_here` in your `.env` file

### 3. Restart Development Server
After adding the API key, restart your dev server:
```bash
npm run dev
```

## 🎯 Features Added

✅ **AI Policy Assistant** integrated into requisition form
✅ **Real-time analysis** of requisition data
✅ **Compliance recommendations** for:
- Quotations for items above KES 100,000
- Approval requirements for high-value items
- Budget compliance checks
- Documentation requirements

✅ **Smart UI** that shows:
- Requisition summary
- High-value item warnings
- AI recommendations in a clean format

## 🔧 How It Works

1. **Fill out your requisition** as usual
2. **Click "Analyze Requisition"** to get AI recommendations
3. **Review recommendations** before submitting
4. **Submit** with confidence knowing you're compliant

The AI assistant uses the `facebook/bart-large-cnn` model to provide intelligent policy analysis tailored to your NiRu DRS requirements.

## 🎨 Design Integration

The component seamlessly integrates with your existing:
- ✅ Tailwind CSS styling
- ✅ Shadcn/ui components
- ✅ NiRu DRS color scheme
- ✅ Responsive design
- ✅ Loading states and error handling
