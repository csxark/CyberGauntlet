try {
      setProcessing(submission.id);

      // Create the challenge directory and files
      const challengeId = `q${Date.now()}`;
      const challengeDir = `public/challenges/${challengeId}`;

      // Create challenge.json
      const challengeData = {
        category: submission.category,
        difficulty: submission.difficulty
      };

      // For now, we'll simulate the approval process
      // In a real implementation, you'd use Supabase Edge Functions
      // to create the files and move assets

      const { error } = await supabase
        .from('challenge_submissions')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', submission.id);

      if (error) throw error;

      setSubmissions(prev =>
        prev.map(s =>
          s.id === submission.id ? { ...s, status: 'approved' as const } : s
        )
      );

      alert(`Challenge "${submission.title}" has been approved and added to the challenge pool!`);
    } catch (err) {
      console.error('Error approving submission:', err);
      alert('Error approving submission. Please try again.');
    } finally {
      setProcessing(null);
    }
  };
=======
  const handleApprove = async (submission: ChallengeSubmission) => {
    try {
      setProcessing(submission.id);

      // Call the approval function
      const { data, error } = await supabase.functions.invoke('approve-challenge', {
        body: {
          submission_id: submission.id
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to approve challenge');
      }

      setSubmissions(prev =>
        prev.map(s =>
          s.id === submission.id ? { ...s, status: 'approved' as const } : s
        )
      );

      alert(data.message);
    } catch (err: any) {
      console.error('Error approving submission:', err);
      alert('Error approving submission: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };
