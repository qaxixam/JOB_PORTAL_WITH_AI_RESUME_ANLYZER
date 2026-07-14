import { APPLICATION_API_END_POINT } from '@/utils/constant';
import axios from 'axios';


const axiosInstance = axios.create({
    timeout: 60000, // 60 seconds!
    withCredentials: true,
})
export const aiService = {

    analyzeApplication: async (applicationId) => {
        try {
            const response = await axiosInstance.get(
                `${APPLICATION_API_END_POINT}/${applicationId}/analyze`,
                { withCredentials: true }


            );
            console.log(response);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to analyze resume' };
        }
    },

    batchAnalyze: async (jobId) => {
        try {
            const response = await axios.post(
                `${API_URL}/applications/job/${jobId}/batch-analyze`,
                {},
                { withCredentials: true }
            );
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Batch analysis failed' };
        }
    }
};