const XLSX = require('xlsx'); // For reading Excel files
const path = require('path'); // For file path utilities
const fs = require('fs/promises'); // For async file operations
const File = require('../Models/File'); // Mongoose model for uploaded files
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Gemini AI SDK

// Initialize Gemini AI with API key from environment variables
let genAI;
try {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found in environment variables. Gemini AI will not be available.');
  } else {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('Gemini AI initialized successfully.');
  }
} catch (error) {
  console.error('Failed to initialize Gemini AI:', error);
}

// Rate limiting for AI requests (to prevent abuse)
const aiRequestCounts = new Map();
const AI_RATE_LIMIT = 5; // Max 5 AI requests per minute per user
const AI_RATE_WINDOW = 60000; // 1 minute in ms

// Middleware to enforce AI rate limiting per user
const aiRateLimiter = (req, res, next) => {
    const userId = req.user.id; // Assumes req.user.id is set by auth middleware
    const now = Date.now();
    const requests = aiRequestCounts.get(userId) || [];
    // Remove requests outside the time window
    const recentRequests = requests.filter(timestamp => now - timestamp < AI_RATE_WINDOW);

    if (recentRequests.length >= AI_RATE_LIMIT) {
        return res.status(429).json({ message: 'Too many AI requests. Please try again later.' });
    }

    recentRequests.push(now);
    aiRequestCounts.set(userId, recentRequests);
    next();
};

// Handle Excel file uploads
const uploadExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        // Reject files over 5MB
        if (req.file.size > 5 * 1024 * 1024) {
            await fs.unlink(req.file.path); // Delete the file
            return res.status(400).json({ message: 'File size should be less than 5MB' });
        }

        // Only allow Excel files
        const validMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream'
        ];
        if (!validMimeTypes.includes(req.file.mimetype)) {
            await fs.unlink(req.file.path);
            return res.status(400).json({ message: 'Only Excel files are allowed' });
        }

        // Save file info to MongoDB
        const file = new File({
            filename: req.file.filename,
            originalName: req.file.originalname,
            user: req.user.id,
            size: req.file.size
        });
        await file.save();

        res.status(200).json({
            message: 'File uploaded successfully',
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message });
    }
};

// List all files uploaded by the current user
const getFiles = async (req, res) => {
    try {
        const files = await File.find({ user: req.user.id })
            .sort({ uploadedAt: -1 });
        res.json({ files });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Analyze an uploaded Excel file and return data + stats
const analyzeExcel = async (req, res) => {
    try {
        const { filename } = req.body;
        // Find the file in DB and ensure it belongs to the user
        const file = await File.findOne({
            filename,
            user: req.user.id
        });

        if (!file) {
            return res.status(404).json({ message: 'File not found or unauthorized' });
        }

        const filePath = path.join(__dirname, '../uploads', filename);

        try {
            // Read Excel file
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            // Get columns and calculate statistics for numeric columns
            const columns = Object.keys(data.length > 0 ? data[0] : {});
            const statistics = [];

            columns.forEach(col => {
                const numericValues = data.map(row => parseFloat(row[col])).filter(val => !isNaN(val));
                if (numericValues.length > 0) {
                    const sum = numericValues.reduce((a, b) => a + b, 0);
                    const mean = sum / numericValues.length;
                    const min = Math.min(...numericValues);
                    const max = Math.max(...numericValues);
                    statistics.push({
                        column: col,
                        mean: mean,
                        min: min,
                        max: max,
                        count: numericValues.length
                    });
                }
            });

            // Return parsed data, columns, and statistics to frontend
            res.json({
                data: data,
                columns: columns,
                rowCount: data.length,
                statistics: statistics
            });
        } catch (error) {
            console.error('Error reading Excel file:', error);
            res.status(500).json({ message: 'Failed to read Excel file' });
        }
    } catch (error) {
        console.error('Error analyzing Excel file:', error);
        res.status(500).json({
            message: 'Failed to analyze Excel file',
            error: error.message
        });
    }
};

// Get user file and chart stats for dashboard
const getStats = async (req, res) => {
    try {
        const files = await File.find({ user: req.user.id });
        const totalSize = files.reduce((acc, file) => acc + file.size, 0);

        // Aggregate chart usage across all user's files
        const chartStats = await File.aggregate([
            { $match: { user: req.user.id } },
            { $unwind: '$analyses' },
            {
                $group: {
                    _id: '$analyses.chartType',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get 5 most recent files and activities
        const recentActivity = await File.find({ user: req.user.id })
            .sort({ uploadedAt: -1 })
            .limit(5)
            .select('filename uploadedAt analyses');

        res.json({
            storage: {
                used: totalSize,
                limit: 5 * 1024 * 1024 // 5MB limit
            },
            chartUsage: chartStats,
            recentFiles: files.slice(0, 5),
            activities: recentActivity.map(file => ({
                type: 'file',
                filename: file.filename,
                timestamp: file.uploadedAt,
                description: `Uploaded ${file.filename}`,
                analyses: file.analyses?.length || 0
            }))
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Generate AI-powered business insights from Excel data
const generateInsights = async (req, res) => {
    try {
        // Check if Gemini AI is initialized
        if (!genAI) {
            return res.status(500).json({
                message: 'AI service not available. Please check server configuration and GEMINI_API_KEY.'
            });
        }

        // Apply AI-specific rate limiting
        aiRateLimiter(req, res, async () => {
            const { columns, rowCount, sampleData, statistics } = req.body;

            // Validate input
            if (!columns?.length || !sampleData?.length || !statistics?.length) {
                return res.status(400).json({
                    message: 'Invalid or missing data for AI analysis. Please provide columns, sample data, and statistics.'
                });
            }

            // Build prompt for Gemini AI (asks for bullet points, trends, best/worst regions, etc.)
            const prompt = `Analyze the provided Excel dataset summary and generate comprehensive business insights.
            
**Dataset Overview:**
- Total Rows: ${rowCount}
- Columns: ${columns.join(', ')}

**Sample Data (first 3 rows):** ${JSON.stringify(sampleData, null, 2)}

**Key Statistics for Numeric Columns:**
${statistics.map(stat =>
` - ${stat.column}: Mean=${stat.mean.toFixed(2)}, Min=${stat.min.toFixed(2)}, Max=${stat.max.toFixed(2)} (from ${stat.count} numeric values)`
).join('\n')}

**Please provide insights in the following structured format:**
**Be concise and to the point. Each bullet point should be brief.**

**1. Key Trends and Patterns:**
   - [Insight 1]
   - [Insight 2]
   - ...

**2. Correlations between Variables:**
   - [Correlation 1: e.g., "Strong positive correlation between Sales and Marketing Spend"]
   - [Correlation 2]
   - ...

**3. Potential Anomalies/Outliers:**
   - [Anomaly 1: e.g., "Unusually high sales on 2023-03-15, investigate cause"]
   - [Anomaly 2]
   - ...

**4. Data Quality Issues (if any):**
   - [Issue 1: e.g., "Missing values in 'Customer ID' column"]
   - [Issue 2]
   - ...

**5. Actionable Recommendations:**
   - [Recommendation 1: e.g., "Focus marketing efforts on Region X based on growth trends"]
   - [Recommendation 2]

**6. Regional Performance Analysis:**
   - Identify the best-performing regions/categories based on relevant metrics (e.g., Sales, Revenue).
   - Identify the worst-performing regions/categories and suggest potential reasons.
   - [Regional Insight 1: e.g., "Region A shows consistent sales growth over the past quarter."]
   - [Regional Insight 2: e.g., "Region C has the lowest average customer acquisition cost but declining sales volume."]
   - ...

Ensure your insights are concise, relevant, and directly actionable where possible. Focus on business implications.
`;

            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(prompt);

                if (!result?.response) {
                    throw new Error('Empty response from AI service');
                }

                const aiResponse = result.response.text();
                const insights = parseAIResponse(aiResponse);

                res.json({ insights });

            } catch (aiError) {
                console.error('AI Generation Error:', aiError);
                let errorMessage = 'Failed to generate AI insights';
                if (aiError.response && aiError.response.data && aiError.response.data.error) {
                    errorMessage = aiError.response.data.error.message || errorMessage;
                } else if (aiError.message.includes('blocked')) {
                    errorMessage = 'AI insights blocked due to content policy. Please try a different prompt.';
                } else if (aiError.message.includes('quota')) {
                    errorMessage = 'AI service quota exceeded. Please try again later.';
                }

                return res.status(500).json({
                    message: errorMessage,
                    error: aiError.message
                });
            }
        });
    } catch (error) {
        console.error('Generate Insights Request Error:', error);
        res.status(500).json({
            message: 'Failed to process insights request',
            error: error.message
        });
    }
};

// Helper: Parse AI response into structured sections
const parseAIResponse = (aiText) => {
    if (!aiText) {
        return [{
            type: 'error',
            title: 'Analysis Error',
            description: 'No insights generated by AI.',
            recommendation: 'The AI did not provide a response. This could be due to an internal error or a very unusual input. Please try again or with different data.'
        }];
    }

    const insights = [];
    // Split by bold headings (e.g., **1. Key Trends and Patterns:**)
    const sections = aiText.split(/\*\*(\d+\.\s*[^:]+):\*\*\s*\n/);

    if (sections.length > 1 && sections[0].trim() === '') {
        sections.shift();
    }

    for (let i = 0; i < sections.length; i += 2) {
        const titleRaw = sections[i] ? sections[i].trim() : '';
        const content = sections[i + 1] ? sections[i + 1].trim() : '';

        if (!titleRaw || !content) continue;

        let type = 'insight';
        if (titleRaw.toLowerCase().includes('trends') || titleRaw.toLowerCase().includes('patterns')) {
            type = 'trend_pattern';
        } else if (titleRaw.toLowerCase().includes('correlations')) {
            type = 'correlation';
        } else if (titleRaw.toLowerCase().includes('anomalies') || titleRaw.toLowerCase().includes('outliers')) {
            type = 'anomaly';
        } else if (titleRaw.toLowerCase().includes('data quality')) {
            type = 'data_quality';
        } else if (titleRaw.toLowerCase().includes('recommendations')) {
            type = 'recommendation';
        }

        const title = titleRaw.replace(/^\d+\.\s*/, '').trim();

        insights.push({
            type,
            title,
            description: content,
            recommendation: extractRecommendation(content)
        });
    }

    if (insights.length === 0 && aiText.trim()) {
        insights.push({
            type: 'raw_insight',
            title: 'AI Insights',
            description: aiText.trim(),
            recommendation: ''
        });
    }

    return insights;
};

// Helper: Extract recommendations from text
const extractRecommendation = (text) => {
    const recommendationMatch = text.match(/recommend(?:ation)?s?:?\s*([^\.]+)/i);
    return recommendationMatch ? recommendationMatch[1].trim() : '';
};

// Helper: Calculate correlation (not used directly in this file)
const calculateCorrelation = (x, y) => {
    const n = x.length;
    if (n === 0) return 0;

    const sum_x = x.reduce((a, b) => a + b, 0);
    const sum_y = y.reduce((a, b) => a + b, 0);
    const sum_xy = x.reduce((acc, curr, i) => acc + curr * y[i], 0);
    const sum_x2 = x.reduce((a, b) => a + b * b, 0);
    const sum_y2 = y.reduce((a, b) => a + b * b, 0);

    const numerator = n * sum_xy - sum_x * sum_y;
    const denominator = Math.sqrt(
        (n * sum_x2 - sum_x * sum_x) *
        (n * sum_y2 - sum_y * sum_y)
    );

    return denominator === 0 ? 0 : numerator / denominator;
};

module.exports = {
    uploadExcel,
    getFiles,
    analyzeExcel,
    getStats,
    generateInsights,
    aiRateLimiter // Export rate limiter middleware for routes
};
