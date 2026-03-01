import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  Block,
  DocumentMetadata
} from '@aws-sdk/client-textract';

const textractClient = new TextractClient({ region: process.env.REGION || 'us-east-1' });

const MAX_POLLING_ATTEMPTS = 60; // 60 attempts
const POLLING_INTERVAL_MS = 5000; // 5 seconds
const MAX_RETRIES = 3;

export interface TextractResult {
  jobId: string;
  status: string;
  blocks?: Block[];
  documentMetadata?: DocumentMetadata;
}

/**
 * Sleep utility for polling
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`, { error });
        await sleep(delay);
      }
    }
  }

  console.error(`All ${maxRetries + 1} attempts failed`, { error: lastError });
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Starts asynchronous text detection job for a document in S3
 */
export async function startDocumentTextDetection(
  s3Bucket: string,
  s3Key: string
): Promise<string> {
  return retryWithBackoff(async () => {
    const command = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: s3Bucket,
          Name: s3Key
        }
      }
    });

    const response = await textractClient.send(command);

    if (!response.JobId) {
      throw new Error('Textract did not return a JobId');
    }

    console.log('Started Textract job', { jobId: response.JobId, s3Key });
    return response.JobId;
  });
}

/**
 * Polls Textract for job completion and retrieves results
 */
export async function getDocumentTextDetection(jobId: string): Promise<TextractResult> {
  let attempts = 0;

  while (attempts < MAX_POLLING_ATTEMPTS) {
    try {
      const command = new GetDocumentTextDetectionCommand({ JobId: jobId });
      const response = await textractClient.send(command);

      console.log(`Textract job status: ${response.JobStatus}`, { jobId, attempt: attempts + 1 });

      if (response.JobStatus === 'SUCCEEDED') {
        // Collect all blocks (handle pagination if needed)
        const blocks: Block[] = response.Blocks || [];
        let nextToken = response.NextToken;

        // Fetch additional pages if they exist
        while (nextToken) {
          const nextCommand = new GetDocumentTextDetectionCommand({
            JobId: jobId,
            NextToken: nextToken
          });
          const nextResponse = await textractClient.send(nextCommand);
          blocks.push(...(nextResponse.Blocks || []));
          nextToken = nextResponse.NextToken;
        }

        return {
          jobId,
          status: 'SUCCEEDED',
          blocks,
          documentMetadata: response.DocumentMetadata
        };
      } else if (response.JobStatus === 'FAILED') {
        throw new Error(`Textract job failed: ${response.StatusMessage || 'Unknown error'}`);
      } else if (response.JobStatus === 'PARTIAL_SUCCESS') {
        console.warn('Textract job completed with partial success', { jobId });
        return {
          jobId,
          status: 'PARTIAL_SUCCESS',
          blocks: response.Blocks || [],
          documentMetadata: response.DocumentMetadata
        };
      }

      // Job is still in progress, wait and retry
      attempts++;
      await sleep(POLLING_INTERVAL_MS);

    } catch (error) {
      console.error('Error polling Textract job', { jobId, attempt: attempts + 1, error });
      throw error;
    }
  }

  throw new Error(`Textract job polling timeout after ${MAX_POLLING_ATTEMPTS} attempts`);
}

/**
 * Extracts plain text from Textract blocks
 * Preserves document structure by organizing text by page and line
 */
export function extractText(result: TextractResult): string {
  if (!result.blocks || result.blocks.length === 0) {
    return '';
  }

  // Filter for LINE blocks which contain the actual text content
  const lineBlocks = result.blocks.filter(block => block.BlockType === 'LINE');

  if (lineBlocks.length === 0) {
    return '';
  }

  // Sort by page and then by vertical position (top to bottom)
  lineBlocks.sort((a, b) => {
    const pageA = a.Page || 0;
    const pageB = b.Page || 0;

    if (pageA !== pageB) {
      return pageA - pageB;
    }

    // Sort by vertical position (top coordinate)
    const topA = a.Geometry?.BoundingBox?.Top || 0;
    const topB = b.Geometry?.BoundingBox?.Top || 0;

    return topA - topB;
  });

  // Extract text from each line
  const textLines: string[] = [];
  let currentPage = 0;

  for (const block of lineBlocks) {
    const page = block.Page || 0;

    // Add page separator for multi-page documents
    if (page > currentPage && currentPage > 0) {
      textLines.push('\n--- Page Break ---\n');
    }
    currentPage = page;

    if (block.Text) {
      textLines.push(block.Text);
    }
  }

  return textLines.join('\n');
}

/**
 * Main function to extract text from a document in S3
 * Combines start, poll, and extract operations
 */
export async function extractTextFromS3Document(
  s3Bucket: string,
  s3Key: string
): Promise<string> {
  try {
    // Start the Textract job
    const jobId = await startDocumentTextDetection(s3Bucket, s3Key);

    // Poll for completion
    const result = await getDocumentTextDetection(jobId);

    // Extract and return text
    const extractedText = extractText(result);

    console.log('Text extraction completed', {
      jobId,
      s3Key,
      textLength: extractedText.length,
      pageCount: result.documentMetadata?.Pages || 0
    });

    return extractedText;

  } catch (error) {
    console.error('Text extraction failed', { s3Bucket, s3Key, error });
    throw new Error(`Text extraction failed: ${(error as Error).message}`);
  }
}
