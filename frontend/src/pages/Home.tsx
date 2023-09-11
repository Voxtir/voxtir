import React from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import withAccessToken from '../components/Auth/with-access-token.tsx';
import Editor from '../components/Editor';
import { useGeneratePresignedUrlForAudioMutation } from '../graphql/generated/graphql';
import { useAppDispatch, useAppSelector } from '../hooks';
import { setTrack } from '../state/track';

function Home({ token }: { token: string }): JSX.Element {
  const documentID = useParams().documentID as string;
  const navigate = useNavigate();
  const [createProjectMutation, { loading }] =
    useGeneratePresignedUrlForAudioMutation({
      context: {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    });
  // Get the track state from the store
  const {
    presignedFileURL,
    presignedFileURLExpiresAtUnixMS,
    documentId: trackDocumentId,
  } = useAppSelector((state) => state.track);
  const dispatch = useAppDispatch();

  // Needed time left in presigned URL
  const requiredTimeLeftInPresignedURL = 60 * 60 * 1000; // 1 hour
  const requiredExpirationTime = new Date();
  requiredExpirationTime.setTime(
    requiredExpirationTime.getTime() + requiredTimeLeftInPresignedURL
  );
  const testDate = new Date();
  testDate.setTime(presignedFileURLExpiresAtUnixMS);
  console.log(
    presignedFileURL,
    presignedFileURLExpiresAtUnixMS,
    requiredExpirationTime.getTime()
  );
  if (
    !presignedFileURL ||
    !presignedFileURLExpiresAtUnixMS ||
    !trackDocumentId ||
    trackDocumentId !== documentID ||
    presignedFileURLExpiresAtUnixMS < requiredExpirationTime.getTime()
  ) {
    console.log('Fetching new presigned URL');
    createProjectMutation({
      variables: {
        documentId: documentID,
      },
    })
      .then((res) => {
        if (res.data?.getPresignedUrlForAudioFile) {
          const expirationTime = new Date(
            // Convert from seconds to milliseconds
            res.data?.getPresignedUrlForAudioFile?.expiresAt * 1000
          );
          dispatch(
            setTrack({
              presignedFileURL: res.data?.getPresignedUrlForAudioFile?.url,
              presignedFileURLExpiresAtUnixMS: expirationTime.getTime(),
              documentId: documentID,
            })
          );
        } else {
          navigate('/');
        }
      })
      .catch((err) => {
        console.error(err);
        navigate('/');
      });
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="w-full h-full">
      {documentID && token && <Editor documentID={documentID} token={token} />}
    </div>
  );
}

const HomeWithAccessToken = withAccessToken(Home);

export default HomeWithAccessToken;
