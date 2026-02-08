import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChallengeTemplate {
  category: string;
  difficulty: string;
  titleTemplate: string;
  descriptionTemplate: string;
  hintTemplates: string[];
  generateCipher: (params: any) => { cipher: string; flag: string; assets?: any[] };
}

const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    category: "Cryptography",
    difficulty: "Beginner",
    titleTemplate: "Caesar Cipher Challenge",
    descriptionTemplate: "Decrypt this message encrypted with a Caesar cipher. The shift is between 1-25.",
    hintTemplates: [
      "Caesar ciphers shift each letter by a fixed number of positions in the alphabet.",
      "Try shifting by 3 positions - it's a common choice.",
      "Count the letters and look for patterns that suggest the correct shift."
    ],
    generateCipher: () => {
      const plaintext = "HELLO WORLD";
      const shift = Math.floor(Math.random() * 25) + 1;
      const cipher = plaintext.split('').map(char => {
        if (char >= 'A' && char <= 'Z') {
          return String.fromCharCode(((char.charCodeAt(0) - 65 + shift) % 26) + 65);
        }
        return char;
      }).join('');
      const flag = `CG{${plaintext.toLowerCase().replace(' ', '_')}}`;
      return { cipher, flag };
    }
  },
  {
    category: "Cryptography",
    difficulty: "Intermediate",
    titleTemplate: "Vigenère Cipher Challenge",
    descriptionTemplate: "This message was encrypted using a Vigenère cipher with a repeating keyword. The keyword is a common English word.",
    hintTemplates: [
      "Vigenère ciphers use a keyword to determine the shift for each letter.",
      "The keyword repeats to match the length of the plaintext.",
      "Look for repeated patterns in the ciphertext that might indicate keyword length."
    ],
    generateCipher: () => {
      const plaintext = "ATTACK AT DAWN";
      const keywords = ["LEMON", "CIPHER", "SECRET", "CRYPTO"];
      const keyword = keywords[Math.floor(Math.random() * keywords.length)];
      let cipher = "";
      let keyIndex = 0;

      for (let i = 0; i < plaintext.length; i++) {
        const char = plaintext[i];
        if (char >= 'A' && char <= 'Z') {
          const shift = keyword[keyIndex % keyword.length].charCodeAt(0) - 65;
          cipher += String.fromCharCode(((char.charCodeAt(0) - 65 + shift) % 26) + 65);
          keyIndex++;
        } else {
          cipher += char;
        }
      }

      const flag = `CG{${plaintext.toLowerCase().replace(/ /g, '_')}}`;
      return { cipher, flag };
    }
  },
  {
    category: "Programming",
    difficulty: "Beginner",
    titleTemplate: "Array Sum Challenge",
    descriptionTemplate: "Given an array of integers, find two numbers that add up to the target sum. Return their indices.",
    hintTemplates: [
      "You can solve this efficiently using a hash map to store numbers you've seen.",
      "For each number, check if target - current exists in your map.",
      "This approach runs in O(n) time instead of O(n²)."
    ],
    generateCipher: () => {
      const nums = [2, 7, 11, 15];
      const target = 9;
      const flag = "CG{[0,1]}";
      return { cipher: `nums = [${nums.join(', ')}], target = ${target}`, flag };
    }
  },
  {
    category: "Steganography",
    difficulty: "Intermediate",
    titleTemplate: "Hidden Message Challenge",
    descriptionTemplate: "This text file contains a hidden message encoded using zero-width Unicode characters. Extract the invisible text.",
    hintTemplates: [
      "Zero-width characters (U+200B, U+200C, U+200D, U+200E, U+200F) are invisible but present in the file.",
      "Use a hex editor or specialized tool to view the raw bytes.",
      "The invisible characters represent binary data that can be converted to ASCII."
    ],
    generateCipher: () => {
      const message = "SECRET";
      let hiddenText = "This is a normal sentence.";

      // Convert message to binary, then to zero-width characters
      const binary = message.split('').map(char =>
        char.charCodeAt(0).toString(2).padStart(8, '0')
      ).join('');

      for (const bit of binary) {
        if (bit === '0') hiddenText += '\u200B'; // ZERO WIDTH SPACE
        else hiddenText += '\u200C'; // ZERO WIDTH NON-JOINER
      }

      const flag = `CG{${message}}`;
      return { cipher: hiddenText, flag };
    }
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the request body
    const { category, difficulty } = await req.json()

    // Select a random template matching the criteria
    const matchingTemplates = CHALLENGE_TEMPLATES.filter(t =>
      (!category || t.category === category) &&
      (!difficulty || t.difficulty === difficulty)
    );

    if (matchingTemplates.length === 0) {
      throw new Error('No templates found for the specified criteria');
    }

    const template = matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)];

    // Generate the cipher/challenge content
    const { cipher, flag, assets } = template.generateCipher({});

    // Generate a new challenge ID
    const challengeId = `q${Date.now()}`;

    // Create the challenge directory and files
    const challengeDir = `public/challenges/${challengeId}`;

    // Create challenge.json
    const challengeData = {
      category: template.category,
      difficulty: template.difficulty
    };

    // Create the challenge content
    const challengeContent = {
      id: challengeId,
      title: template.titleTemplate,
      description: template.descriptionTemplate.replace('[CIPHER]', cipher),
      file_name: assets ? `challenge_assets_${challengeId}.txt` : '',
      file_path: assets ? `/challenges/${challengeId}/challenge_assets_${challengeId}.txt` : '',
      correct_flag: flag,
      hints: template.hintTemplates,
      category: template.category,
      difficulty: template.difficulty
    };

    // Insert into challenges table
    const { data: insertedChallenge, error: insertError } = await supabaseClient
      .from('challenges')
      .insert({
        title: challengeContent.title,
        description: challengeContent.description,
        category: challengeContent.category,
        difficulty: challengeContent.difficulty,
        correct_flag: challengeContent.correct_flag,
        hints: challengeContent.hints,
        file_name: challengeContent.file_name,
        file_path: challengeContent.file_path,
        active: true
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert challenge: ${insertError.message}`);
    }

    // In a real implementation, you would create the actual files
    // For now, we'll just return the challenge data
    // The files would be created using Deno's file system APIs

    return new Response(
      JSON.stringify({
        success: true,
        message: `Challenge "${challengeContent.title}" has been generated successfully!`,
        challenge_id: challengeId,
        challenge: insertedChallenge,
        challenge_data: challengeContent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error generating challenge:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
